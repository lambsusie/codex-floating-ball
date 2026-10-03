const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const assert = require("node:assert/strict");
const { attachWindowLifecycle } = require("../src/main/window-lifecycle");
const output = path.join(__dirname, "../qa-v1.2.1/regression");
app.setPath("userData", fs.mkdtempSync(path.join(os.tmpdir(), "codex-floating-ball-v121-regression-")));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  fs.mkdirSync(output, { recursive: true });
  const errors = [];
  const window = new BrowserWindow({ width: 520, height: 360, frame: false, show: false, skipTaskbar: true,
    webPreferences: { preload: path.join(__dirname, "visual-smoke-preload.js"), contextIsolation: true, nodeIntegration: false } });
  const js = (code) => window.webContents.executeJavaScript(code);
  window.webContents.on("console-message", (_e, level, message) => { if (level >= 3) errors.push(message); });
  const capture = async (name) => fs.writeFileSync(path.join(output, `${name}.png`), (await window.webContents.capturePage()).toPNG());
  try {
    await window.loadFile(path.join(__dirname, "../src/renderer/index.html"));
    await wait(400);
    await js("localStorage.setItem('codex-led-auto-check-updates','false'); setAutoCheckUpdates(false); setLanguage('zh'); updateDetailView('history');");
    await wait(150);
    const before = await js("getPeriodRange(state.historyPeriod,state.historyAnchor)");
    window.webContents.sendInputEvent({ type: "mouseMove", x: 290, y: 220 });
    window.webContents.sendInputEvent({ type: "mouseWheel", x: 290, y: 220, deltaY: 500, deltaX: 0 });
    await wait(200);
    // Electron wheel sign differs by platform; use DOM WheelEvent for deterministic checks too.
    await js(`(() => { const c=el.historyChart,r=c.getBoundingClientRect(); c.dispatchEvent(new WheelEvent('wheel',{clientX:r.left+240,clientY:r.top+70,deltaY:-600,bubbles:true,cancelable:true})); })()`);
    const zoom = await js("state.historyViewport");
    assert.ok(zoom && zoom.end - zoom.start < before.end - before.start);
    const plotBefore = await js("JSON.stringify(state.historyPlot)");
    window.webContents.sendInputEvent({ type: "mouseDown", button: "left", x: 260, y: 220, clickCount: 1 });
    await wait(60);
    window.webContents.sendInputEvent({ type: "mouseMove", modifiers: ["leftButtonDown"], x: 310, y: 220 });
    await wait(60);
    window.webContents.sendInputEvent({ type: "mouseUp", button: "left", x: 310, y: 220, clickCount: 1 });
    await wait(150);
    const panned = await js("state.historyViewport");
    assert.ok(panned.start !== zoom.start);
    assert.equal(await js("JSON.stringify(state.historyPlot)"), plotBefore);
    await js(`(() => { const r=el.historyChart.getBoundingClientRect();const p=state.historyChartPoints[0]; if(p) el.historyChart.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+p.x,clientY:r.top+p.primaryY})); })()`);
    assert.equal(await js("el.historyTooltip.hidden"), false);
    await capture("01-history-zoom-light");
    const visiblePoints = await js("state.historyChartPoints.length");
    await js("document.getElementById('historyZoomReset').click()");
    assert.equal(await js("state.historyViewport"), null);
    await js(`(() => {const c=el.historyChart,r=c.getBoundingClientRect();c.dispatchEvent(new WheelEvent('wheel',{clientX:r.left+10,clientY:r.top+70,deltaY:-600,bubbles:true,cancelable:true}));})()`);
    assert.equal(await js("state.historyViewport"), null);
    const layouts = [];
    for (const lang of ["zh", "en"]) {
      for (const theme of ["light", "dark"]) {
        await js(`setLanguage('${lang}'); setTheme('${theme}'); updateDetailView('reports');`);
        await wait(150);
        for (const period of ["day", "week", "month"]) {
          await js(`document.querySelector('[data-report-period="${period}"]').click()`);
          await wait(80);
          await capture(`reports-${lang}-${theme}-${period}`);
          const layout = await js(`(() => {
            const s=document.getElementById('reportsScroll'),p=document.getElementById('reportsPanel');
            const visible=[...p.querySelectorAll('button,input')].filter(e=>e.getBoundingClientRect().width>0);
            return {width:s.clientWidth,scrollWidth:s.scrollWidth,bottom:s.getBoundingClientRect().bottom,
              panelBottom:p.getBoundingClientRect().bottom,total:document.getElementById('reportsTotal').textContent,
              controlsFit:visible.every(e=>{const r=e.getBoundingClientRect();return r.right<=520&&r.left>=0}),
              mainHidden:getComputedStyle(document.querySelector('.content')).display==='none'};
          })()`);
          assert.ok(layout.controlsFit && layout.mainHidden);
          assert.ok(layout.scrollWidth <= layout.width && layout.bottom <= 360);
          assert.notEqual(layout.total, "--");
          layouts.push({ lang, theme, period, ...layout });
        }
      }
    }
    await js("setLanguage('zh'); setTheme('light'); updateDetailView('main')");
    await wait(100);
    await capture("02-main-light");
    let collapsed = false, quitting = false, cleared = false;
    attachWindowLifecycle(window, { isQuitting: () => quitting, collapse: () => { collapsed = true; }, onClosed: () => { cleared = true; } });
    window.close();
    assert.ok(collapsed && !window.isDestroyed());
    quitting = true;
    const closed = new Promise((resolve) => window.once("closed", resolve));
    window.close();
    await closed;
    assert.ok(cleared && window.isDestroyed());
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, "smoke-results.json"), JSON.stringify({ zoom, panned, visiblePoints, layouts, errors, closeIntercepted: collapsed, closedCleared: cleared }, null, 2));
    console.log("Regression passed: wheel/drag/tooltip/reset, 12 report layouts, native close lifecycle.");
    app.exit(0);
  } catch (error) {
    console.error(error);
    if (!window.isDestroyed()) await capture("failure");
    app.exit(1);
  }
}).catch((error) => { console.error(error); app.exit(1); });
