const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn, execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const root = path.resolve(__dirname, '..');
const executable = process.env.CFB_EXE || path.resolve(root, '../codex-floating-ball-v2.0-tauri-prototype/src-tauri/target/release/codex-floating-ball.exe');
const output = path.join(root, 'qa', `full-${Date.now()}`);
const profile = path.join(output, 'profile'), legacy = path.join(output, 'legacy'), logs = path.join(output, 'codex');
for (const dir of [profile, legacy, path.join(logs, 'sessions'), path.join(logs, 'archived_sessions')]) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(legacy, 'settings.json'), JSON.stringify({ autoRefreshMinutes: 0, compactAppearance: { ballSize: 120, quotaFontSize: 27, resetFontSize: 11 }, uiPreferences: { 'codex-led-auto-check-updates': 'false', 'codex-led-lang': 'zh', 'codex-led-theme': 'light', 'codex-led-history-metric': 'remaining', 'codex-led-smart-enabled': 'false', 'codex-led-regular-refresh-minutes': '0' } }));
const now = Date.now(), records = Array.from({ length: 121 }, (_, i) => ({ timestamp: now - (120-i)*60000, primaryRemaining: 95-i*.2, secondaryRemaining: 80-i*.1, primaryResetsAt: now+12600000, secondaryResetsAt: now+300000000 }));
fs.writeFileSync(path.join(legacy, 'quota-history.ndjson'), records.map(r => JSON.stringify(r)).join('\n')+'\n');
const day = new Date(now + 8*3600000 - 86400000).toISOString().slice(0,10);
const tokenLog = [
  { type: 'session_meta', payload: { id: 'fixture-a' } },
  { type: 'response_item', payload: { content: 'PRIVATE CONVERSATION MUST NOT BE INDEXED' } },
  ...[1,2].map(i => ({ type: 'token_usage_record', timestamp: `${day}T0${i}:00:00+08:00`, payload: { thread_id: 'fixture-a', response_id: `r${i}`, usage: { input_tokens: i*100, output_tokens: i*10, total_tokens: i*110 } } }))
].map(v => JSON.stringify(v)).join('\n')+'\n';
fs.writeFileSync(path.join(logs, 'sessions/a.jsonl'), tokenLog);
fs.writeFileSync(path.join(logs, 'archived_sessions/a.jsonl'), tokenLog);
const originalHistory = fs.readFileSync(path.join(legacy, 'quota-history.ndjson'), 'utf8');
const results = [], errors = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function check(name, run) { await run(); results.push(name); console.log(`PASS ${name}`); }
async function main() {
  const server = net.createServer(); await new Promise(r => server.listen(0, '127.0.0.1', r)); const port = server.address().port; await new Promise(r => server.close(r));
  const child = spawn(executable, ['--qa-profile', profile, '--qa-legacy', legacy, '--qa-codex-home', logs, '--qa-debug-port', String(port), '--mock-quota'], { windowsHide: true, stdio: 'ignore' });
  let browser, page;
  try {
    for (let i=0;i<40;i++) { try { await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(1000) }); browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout:3000 }); break; } catch { if(child.exitCode!==null) throw Error(`Exited ${child.exitCode}`); await sleep(200); } }
    assert.ok(browser, 'WebView2 available'); const context=browser.contexts()[0]; context.setDefaultTimeout(15000); page=context.pages()[0] || await context.waitForEvent('page');
    page.on('pageerror',e=>errors.push(e.message)); page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
    const api=(method,value=null)=>page.evaluate(({method,value})=>window.__TAURI__.core.invoke('call',{method,value}),{method,value});
    const native=action=>JSON.parse(execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'qa-native-window.ps1'),'-ProcessId',String(child.pid),'-Action',action],{encoding:'utf8',windowsHide:true}));
    const mode=async m=>{await api('window:mode:set',m); await page.waitForFunction(m=>document.body.dataset.mode===m,m);};
    const view=async v=>{await mode('detail');await page.evaluate(v=>updateDetailView(v),v);await page.waitForFunction(v=>document.body.dataset.view===v,v);};
    await page.waitForFunction(()=>typeof state!=='undefined'&&state.lastQuota&&!state.loading);
    await check('Full frontend boots; copies legacy history without changing original',async()=>{
      assert.equal(await page.locator('#compactRemaining').textContent(),'68%');
      assert.equal((await api('bootstrap')).migration.status,'imported');
      assert.equal((await api('history:get',{start:now-86400000,end:now+3600000,maxPoints:100000})).length,122);
      assert.equal(fs.readFileSync(path.join(legacy,'quota-history.ndjson'),'utf8'),originalHistory);
    });
    await check('Single click opens; double click refreshes without opening',async()=>{
      await page.locator('#compactBall').click();await page.waitForFunction(()=>state.mode==='detail');
      await mode('compact');const before=fs.readFileSync(path.join(profile,'quota-history.ndjson'),'utf8').split('\n').filter(Boolean).length;
      await page.locator('#compactBall').dblclick({delay:60});await sleep(400);
      assert.equal(await page.evaluate(()=>state.mode),'compact');assert.equal(fs.readFileSync(path.join(profile,'quota-history.ndjson'),'utf8').split('\n').filter(Boolean).length,before+1);
      const start=(await api('qa:diagnostics')).position;
      const ball=await page.locator('#compactBall').boundingBox();
      await page.mouse.move(ball.x+ball.width/2,ball.y+ball.height/2);await page.mouse.down();
      await page.mouse.move(ball.x+ball.width/2-20,ball.y+ball.height/2+14,{steps:4});await page.mouse.up();await sleep(200);
      const moved=(await api('qa:diagnostics')).position;
      assert.ok(moved.x<start.x&&moved.y>start.y,'Dragging the ball moves its native window');
      assert.equal(await page.evaluate(()=>state.mode),'compact','Dragging does not open details');
    });
    await check('Real Rust scan plus worker produces deduplicated day/week/month reports',async()=>{
      await page.waitForFunction(async()=>{const d=await window.__TAURI__.core.invoke('call',{method:'reports:get'});return d.store?.sourceStatus==='ready'&&!d.scanning;},null,{timeout:30000});
      for(const period of ['day','week','month']) {
        const report=await page.evaluate(q=>window.codexQuota.getReport(q),{period,anchor:day});assert.equal(report.totals.total_tokens,330);
      }
      assert.ok(!fs.readFileSync(path.join(profile,'token-usage-index.json'),'utf8').includes('PRIVATE CONVERSATION'));
      await view('reports');await page.locator('#reportsDate').fill(day);await page.locator('#reportsDate').dispatchEvent('change');
      await page.waitForFunction(()=>document.querySelector('#reportsTotal').textContent==='330');await page.screenshot({path:path.join(output,'reports-light.png')});
    });
    await check('Chart draws both series, supports periods and export',async()=>{
      await view('history');await page.waitForFunction(()=>state.historyChartPoints.length>30&&!state.historyLoading);
      for(const period of ['cycle','day','week','month']) {await page.locator(`[data-period="${period}"]`).click();await page.waitForFunction(p=>state.historyPeriod===p&&!state.historyLoading,period);}
      await page.locator('[data-period="cycle"]').click();await page.waitForFunction(()=>!state.historyLoading&&state.historyChartPoints.length>30);
      await page.locator('#historyMetricSelect').selectOption('used');await page.waitForFunction(()=>state.historyMetric==='used');
      await page.locator('#historyMetricSelect').selectOption('remaining');await page.waitForFunction(()=>state.historyMetric==='remaining');
      const exported=await api('history:export','zh');assert.ok(exported.recordCount>=123);const csv=fs.readFileSync(exported.filePath,'utf8');assert.ok(csv.startsWith('\uFEFFtimestamp_iso'));assert.ok(csv.includes('seven_day_remaining_percent'));
      await page.screenshot({path:path.join(output,'chart-light.png')});
      const png=PNG.sync.read(await page.locator('#historyChart').screenshot());let blue=0,red=0;
      for(let i=0;i<png.data.length;i+=4){const [r,g,b]=png.data.subarray(i,i+3);if(b>r+50&&b>g+20)blue++;if(r>g+50&&r>b+20)red++;}assert.ok(blue>50&&red>50,`${blue} blue ${red} red pixels`);
    });
    await check('Wheel zoom, left drag and grid follow pixel displacement; right drag is ignored',async()=>{
      const box=await page.locator('#historyChart').boundingBox();const plot=await page.evaluate(()=>state.historyPlot);
      const width=plot.right-plot.left;const x=box.x+plot.left+width*.55,y=box.y+plot.top+(plot.bottom-plot.top)*.5;
      await page.mouse.move(x,y);const before=await page.evaluate(()=>getHistoryViewport());await page.mouse.wheel(0,-240);await sleep(100);
      const zoomed=await page.evaluate(()=>getHistoryViewport());assert.ok(zoomed.end-zoomed.start<before.end-before.start);
      await page.mouse.down({button:'left'});await page.mouse.move(x+45,y,{steps:5});await page.mouse.up({button:'left'});await sleep(150);
      const panned=await page.evaluate(()=>getHistoryViewport());assert.ok(panned.start<zoomed.start);assert.ok(Math.abs((zoomed.start-panned.start)/(zoomed.end-zoomed.start)*width-45)<2);
      await page.mouse.down({button:'right'});await page.mouse.move(x+15,y,{steps:3});await page.mouse.up({button:'right'});assert.deepEqual(await page.evaluate(()=>getHistoryViewport()),panned);
      await page.locator('#historyZoomReset').click();await page.waitForFunction(()=>!state.historyViewport);
    });
    await check('Hover shows the record values and chart pin survives focus loss',async()=>{
      const box=await page.locator('#historyChart').boundingBox();const point=await page.evaluate(()=>state.historyChartPoints[Math.floor(state.historyChartPoints.length/2)]);
      const plot=await page.evaluate(()=>state.historyPlot);const range=await page.evaluate(()=>getHistoryViewport());
      await page.mouse.move(box.x+point.x,box.y+point.primaryY);
      await page.waitForFunction(()=>!document.querySelector('#historyTooltip').hidden);
      await page.locator('#historyPinBtn').click();await page.waitForFunction(()=>state.historyPinned);assert.equal((await api('qa:diagnostics')).topmost,true);
      native('Deactivate');await sleep(200);assert.equal(await page.evaluate(()=>state.mode),'detail');
      await page.locator('#historyPinBtn').click();native('Deactivate');await page.waitForFunction(()=>state.mode==='compact');
      assert.equal(native('Inspect').appWindow,false);assert.equal(native('Inspect').toolWindow,true);
      await view('history');await page.locator('#historyPinBtn').click();await page.waitForFunction(()=>state.historyPinned);
      native('Close');await page.waitForFunction(()=>state.mode==='compact');
    });
    await check('All appearance, reset-time and default-page choices work',async()=>{
      await view('settings');
      for(const id of ['primaryTimeDisplaySelect','secondaryTimeDisplaySelect','compactTimeDisplaySelect']) await page.locator('#'+id).selectOption('point');
      await page.locator('#defaultDetailViewSelect').selectOption('reports');await mode('compact');await page.locator('#compactBall').click();await page.waitForFunction(()=>state.view==='reports');
      await view('settings');await page.locator('#defaultDetailViewSelect').selectOption('history');await mode('compact');await page.locator('#compactBall').click();await page.waitForFunction(()=>state.view==='history');
      for(const palette of ['blue','jade','rose','graphite']) {
        await page.evaluate(p=>setPalette(p),palette);await page.evaluate(()=>setTheme('dark'));await page.waitForFunction(()=>document.body.dataset.theme==='dark');
        await page.screenshot({path:path.join(output,`chart-${palette}-dark.png`)});
      }
      await view('settings');await page.locator('#languageSelect').selectOption('en');await page.waitForFunction(()=>state.lang==='en');await page.screenshot({path:path.join(output,'settings-dark-en.png')});
      for(const size of [88,120,200]) {
        const a=await api('settings:compactAppearance:set',{ballSize:size,quotaFontSize:64,resetFontSize:24});await page.evaluate(a=>applyCompactAppearance(a),a);await mode('compact');
        const bounds=await page.evaluate(()=>{const a=document.querySelector('#compactRemaining').getBoundingClientRect(),b=document.querySelector('#compactReset').getBoundingClientRect();return {a:a.toJSON(),b:b.toJSON(),w:innerWidth,h:innerHeight};});
        assert.ok(bounds.a.bottom<=bounds.b.top+1);assert.ok(bounds.b.bottom<=bounds.h);await page.screenshot({path:path.join(output,`ball-${size}.png`)});
        const image=PNG.sync.read(await page.screenshot({omitBackground:true}));
        assert.equal(image.data[3],0,'Orb outer corner must be transparent');
      }
    });
    await check('Custom weekly warning and weekly-only accounts',async()=>{
      await page.evaluate(()=>setWeeklyAlertThreshold(50));await page.evaluate(()=>refreshQuota());await page.waitForFunction(()=>state.weeklyAlertActive);
      assert.equal(await page.locator('#weeklyWarning').isVisible(),true);
      await api('qa:quota',{rateLimits:{primary:null,secondary:{usedPercent:70,resetsAt:Math.floor(now/1000)+300000},planType:'pro'}});await page.evaluate(()=>refreshQuota());
      assert.equal(await page.locator('#compactRemaining').textContent(),'30%');assert.equal(await page.evaluate(()=>state.lastQuota.quotaMode),'weekly-only');
      assert.equal(await page.locator('#weeklyWarning').isVisible(),false);
    });
    await check('Smart idle switches to manual/30/60; main and chart selectors stay synchronized',async()=>{
      await page.clock.install();await page.evaluate(async()=>{setSmartIdleMinutes(5);await setSmartActiveRefreshMinutes(1);await setSmartEnabled(true);});
      for(const idle of [0,30,60]) {
        await page.evaluate(async n=>{await setSmartIdleRefreshMinutes(n);await activateSmartRefresh();},idle);
        await page.clock.fastForward(301000);await page.waitForFunction(n=>state.autoRefreshMinutes===n&&state.smartMode===(n?'idle':'manual'),idle);
        await page.evaluate(()=>refreshQuota({userInitiated:true}));await page.waitForFunction(()=>state.smartMode==='active'&&state.autoRefreshMinutes===1);
      }
      await view('main');await page.locator('#autoRefreshSelect').selectOption('5');await page.waitForFunction(()=>state.smartActiveRefreshMinutes===5&&state.autoRefreshMinutes===5);
      await view('history');assert.equal(await page.locator('#historyAutoRefreshSelect').inputValue(),'5');await page.locator('#historyAutoRefreshSelect').selectOption('10');
      await page.waitForFunction(()=>state.smartActiveRefreshMinutes===10);await view('settings');assert.equal(await page.locator('#smartActiveRefreshSelect').inputValue(),'10');
      await page.clock.resume();await page.evaluate(()=>setSmartEnabled(false));
    });
    await check('Saved UI preferences survive backend persistence; native close does not destroy window',async()=>{
      await page.evaluate(()=>window.flushWidgetPreferences());const saved=JSON.parse(fs.readFileSync(path.join(profile,'settings.json'),'utf8'));assert.equal(saved.uiPreferences['codex-led-lang'],'en');assert.equal(saved.uiPreferences['codex-led-smart-active-refresh-minutes'],'10');
      await view('main');native('Close');await page.waitForFunction(()=>state.mode==='compact');assert.equal(native('Inspect').exists,true);
      assert.deepEqual(errors,[]);
    });
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,results,errors},null,2));
  } catch(error) {
    if(page) {console.log(await page.evaluate(()=>({url:location.href,body:document.body.dataset,hasApi:!!window.codexQuota,bodyText:document.body.innerText})).catch(()=>{}));await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});}
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:false,results,errors,error:error.stack},null,2));throw error;
  } finally {
    if(page)await page.evaluate(()=>window.codexQuota?.close()).catch(()=>{});if(browser)await browser.close().catch(()=>{});await sleep(500);if(child.exitCode===null)child.kill();console.log(`QA_OUTPUT=${output}`);
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
