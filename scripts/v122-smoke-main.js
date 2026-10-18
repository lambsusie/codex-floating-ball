const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const assert = require("node:assert/strict");
const scale = process.env.CFB_TEST_SCALE || "1";
app.commandLine.appendSwitch("force-device-scale-factor", scale);
app.setPath("userData", fs.mkdtempSync(path.join(os.tmpdir(), "floating-ball-v122-ui-")));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const output = path.join(__dirname, "../qa-v1.2.2");
const target = process.env.CFB_TEST_APP_ROOT || path.join(__dirname, "..");
function contrast(a, b) {
  const luminance = (color) => {
    const rgb = color.startsWith("#") ? color.slice(1).match(/../g).map((n) => parseInt(n, 16)) : color.match(/[\d.]+/g).slice(0, 3).map(Number);
    const linear = rgb.map((n) => { const c = n / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return linear.reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
  };
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
app.whenReady().then(async () => {
  const window = new BrowserWindow({ width: 520, height: 360, frame: false, show: false, skipTaskbar: true,
    webPreferences: { preload: path.join(__dirname, "visual-smoke-preload.js"), contextIsolation: true } });
  const js = (code) => window.webContents.executeJavaScript(code);
  const run = (code) => js(`(async () => { ${code} })()`);
  const errors = [];
  window.webContents.on("console-message", (_event, level, message) => { if (level >= 3) errors.push(message); });
  const capture = async (name) => {
    await wait(150);
    fs.writeFileSync(path.join(output, `${name}-${scale}x.png`), (await window.webContents.capturePage()).toPNG());
  };
  const results = [];
  try {
    fs.mkdirSync(output, { recursive: true });
    await window.loadFile(path.join(target, "src/renderer/index.html"));
    await wait(400);
    await js("setAutoCheckUpdates(false)");
    for (const palette of ["blue", "jade", "rose", "graphite"]) {
      await js(`document.querySelector('input[name="palette"][value="${palette}"]').click()`);
      assert.equal(await js("state.palette"), palette);
      for (const theme of ["light", "dark"]) {
        for (const lang of ["zh", "en"]) {
          const name = `${palette}-${theme}-${lang}`;
          await run(`setLanguage('${lang}'); await setTheme('${theme}'); await setRegularRefreshMinutes(60); updateDetailView('main')`);
          const colors = await js(`(() => {
            const style=getComputedStyle(document.body); const result={};
            for (const name of ['palette-text','palette-muted','palette-panel','palette-surface','palette-accent','palette-selected','chart-primary','chart-secondary','orb-text','fill-top','fill-bottom']) result[name]=style.getPropertyValue('--'+name).trim();
            return result;
          })()`);
          for (const [fg, bg, minimum] of [["palette-text","palette-panel",4.5],["palette-muted","palette-surface",4.5],
            ["palette-accent","palette-selected",4.5],["chart-primary","palette-surface",3],["chart-secondary","palette-surface",3],
            ["orb-text","fill-top",4.5],["orb-text","fill-bottom",4.5]]) {
            assert.ok(contrast(colors[fg],colors[bg]) >= minimum, `${name}: ${fg}/${bg} contrast ${contrast(colors[fg],colors[bg])}`);
          }
          await capture(`overview-${name}`);
          await js("updateDetailView('history'); state.historyViewport=null");
          await wait(180);
          const layout = await js(`(() => {
            el.historyPointCount.textContent=state.lang==='zh'?'100,000 个记录点':'100,000 points';
            const selectors=['#historyAutoRefreshSelect','#historyAutoRefreshLabel','#historyPointCount','.history-legend > span:first-child','.history-legend > span:nth-child(2)'];
            const bounds=selectors.map(s=>{const e=document.querySelector(s);const r=e.getBoundingClientRect();return {selector:s,left:r.left,right:r.right,top:r.top,bottom:r.bottom};});
            return {bounds,legend:getComputedStyle(document.querySelector('.legend-primary')).backgroundColor,series:getComputedStyle(document.body).getPropertyValue('--chart-primary').trim(),overflow:el.historyPanel.scrollWidth>el.historyPanel.clientWidth};
          })()`);
          assert.equal(layout.overflow,false,name);
          for (const r of layout.bounds) assert.ok(r.left>=18 && r.right<=502 && r.top>=290 && r.bottom<=342, `${name} ${JSON.stringify(r)}`);
          for(let i=0;i<layout.bounds.length;i++) for(let j=i+1;j<layout.bounds.length;j++) {
            const a=layout.bounds[i],b=layout.bounds[j];
            assert.ok(a.right<=b.left || b.right<=a.left || a.bottom<=b.top || b.bottom<=a.top,`${name} footer overlap`);
          }
          assert.ok(contrast(layout.legend,layout.series)<1.01,`${name} legend color mismatch`);
          await capture(`chart-${name}`);
          const canvasColors = await js(`(() => {
            const canvas=el.historyChart, data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
            const style=getComputedStyle(document.body);
            return ['--chart-primary','--chart-secondary'].map(name=>{
              const rgb=style.getPropertyValue(name).trim().slice(1).match(/../g).map(n=>parseInt(n,16));let pixels=0;
              for(let i=0;i<data.length;i+=4) if(rgb.every((c,k)=>Math.abs(data[i+k]-c)<3) && data[i+3]>250) pixels++;
              return pixels;
            });
          })()`);
          assert.ok(canvasColors.every(n=>n>30),`${name} canvas series colors missing`);
          await js("showHistoryFooterMessage('Export failed: a deliberately long error message used to verify the refresh selector remains accessible')");
          assert.equal(await js("el.historyAutoRefreshSelect.getBoundingClientRect().bottom<=342"),true,`${name} export status overflow`);
          await js("updateDetailView('settings'); document.querySelector('.settings-scroll').scrollTop=130");
          assert.equal(await js(`document.querySelector('.palette-row').scrollWidth<=document.querySelector('.palette-row').clientWidth`),true,name);
          await capture(`settings-${name}`);
          await js("updateDetailView('reports')");
          await wait(180);
          assert.equal(await js("document.querySelector('.reports-scroll').scrollWidth<=document.querySelector('.reports-scroll').clientWidth"),true,name);
          await capture(`reports-${name}`);
          results.push(name);
        }
      }
    }
    window.setContentSize(120,120);
    for(const palette of ['blue','jade','rose','graphite']) for(const theme of ['light','dark']) {
      await run(`setPalette('${palette}'); await setTheme('${theme}'); await setWindowMode('compact')`);
      await capture(`ball-${palette}-${theme}`);
    }
    window.setContentSize(520,360);
    await run("await setWindowMode('detail')");
    for(const palette of ['blue','jade','rose','graphite']) for(const theme of ['light','dark']) {
      for(const glassEnabled of [true,false]) {
        await js(`setPalette('${palette}'); applyThemeState({source:'${theme}',resolvedTheme:'${theme}',platform:'darwin',glassEnabled:${glassEnabled}})`);
        const alpha=await js("(() => {const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');ctx.fillStyle=getComputedStyle(document.querySelector('.detail-panel')).backgroundColor;ctx.fillRect(0,0,1,1);return ctx.getImageData(0,0,1,1).data[3];})()");
        assert.equal(alpha<255,glassEnabled,`${palette} ${theme} macOS material fallback`);
      }
    }
    await run("setPalette('rose'); await setTheme('system'); applyThemeState({source:'system',resolvedTheme:'dark',platform:'win32',glassEnabled:false})");
    assert.equal(await js("document.body.dataset.palette"), "rose");
    assert.equal(await js("document.body.dataset.theme"), "dark");
    await new Promise((resolve) => { window.webContents.once("did-finish-load",resolve);window.webContents.reload(); });
    await wait(400);
    assert.equal(await js("state.palette"),"rose");
    await js("localStorage.setItem('codex-led-palette','invalid')");
    await new Promise((resolve) => { window.webContents.once("did-finish-load",resolve);window.webContents.reload(); });
    await wait(400);
    assert.equal(await js("state.palette"),"blue");
    const warnings = await js(`(() => {const colors=[];for(const palette of ['blue','jade','rose','graphite']) {setPalette(palette);document.body.dataset.state='warning';colors.push(getComputedStyle(el.compactLiquidFill).backgroundImage);}return colors;})()`);
    assert.equal(new Set(warnings).size,1);
    await run("setPalette('jade'); setLanguage('zh'); await setTheme('light'); renderQuota(state.lastQuota); updateDetailView('history'); updateHistoryPinButton(true)");
    await capture("chart-pinned-jade");
    assert.deepEqual(errors,[]);
    const result={source:target.includes('app.asar')?'packaged-asar':'source',scale,layouts:results.length,views:4,compactPalettes:8,macMaterialStyles:16,palettePersisted:true,invalidPaletteFallback:true,systemTheme:true,contrastChecked:true,canvasPixelsChecked:true,warningColorsStable:true,errors};
    fs.writeFileSync(path.join(output,`ui-results-${scale}x.json`),JSON.stringify(result,null,2));
    console.log(JSON.stringify(result));window.destroy();app.exit(0);
  } catch(error) { console.error(error); console.error(errors);app.exit(1); }
});
setTimeout(()=>{console.error('UI test timeout');app.exit(1);},90000).unref();
