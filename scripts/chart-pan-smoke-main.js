const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const assert = require("node:assert/strict");
const scale = process.env.CFB_TEST_SCALE || "1";
app.commandLine.appendSwitch("force-device-scale-factor", scale);
app.setPath("userData", path.join(os.tmpdir(), `floating-ball-pan-qa-${scale}`));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const output = path.join(__dirname, "../qa-v1.2.0");
app.whenReady().then(async () => {
  const window = new BrowserWindow({ width: 520, height: 360, frame: false, show: false, skipTaskbar: true,
    webPreferences: { preload: path.join(__dirname, "visual-smoke-preload.js"), contextIsolation: true } });
  const js = (code) => window.webContents.executeJavaScript(code);
  const errors = [];
  window.webContents.on("console-message", (_event, level, message) => { if (level >= 3) errors.push(message); });
  async function settled() {
    for (let i = 0; i < 50; i++) {
      if (await js("!state.historyLoading && !historyLoadTimer")) return;
      await wait(50);
    }
    throw new Error("History load timed out");
  }
  async function drag(delta, button = "left") {
    const origin = await js(`(() => { const r=el.historyChart.getBoundingClientRect(); return {x:Math.round(r.left+240),y:Math.round(r.top+60)}; })()`);
    window.webContents.sendInputEvent({ type: "mouseDown", button, ...origin, clickCount: 1 });
    await wait(20);
    for (let step = 1; step <= 5; step++) {
      window.webContents.sendInputEvent({ type: "mouseMove", modifiers: [`${button}ButtonDown`], x: origin.x + delta * step / 5, y: origin.y });
      await wait(20);
    }
    window.webContents.sendInputEvent({ type: "mouseUp", button, x: origin.x + delta, y: origin.y, clickCount: 1 });
    await wait(100);
    await settled();
  }
  try {
    await window.loadFile(path.join(__dirname, "../src/renderer/index.html"));
    await wait(350);
    await js("setAutoCheckUpdates(false); updateDetailView('history')");
    await settled();
    const checks = [];
    for (const period of ["cycle", "day", "week", "month"]) {
      for (const zoomed of [false, true]) {
        await js(`setHistoryPeriod('${period}')`);
        await settled();
        if (zoomed) {
          await js(`(() => {const r=el.historyChart.getBoundingClientRect();const p=state.historyChartPoints.reduce((a,b)=>Math.abs(a.x-190)<Math.abs(b.x-190)?a:b);el.historyChart.dispatchEvent(new WheelEvent('wheel',{clientX:r.left+p.x,clientY:r.top+60,deltaY:-400,cancelable:true}));})()`);
          await settled();
        }
        const point = await js("state.historyChartPoints.reduce((a,b)=>Math.abs(a.x-190)<Math.abs(b.x-190)?a:b)");
        const before = await js("getHistoryViewport()");
        await drag(100, "right");
        assert.deepEqual(await js("getHistoryViewport()"), before, "Right-button drag must not change the viewport");
        assert.equal(await js("historyPan"), null);
        await drag(100);
        const moved = await js(`state.historyChartPoints.find(p=>p.timestamp===${point.timestamp})`);
        assert.ok(moved, "The same sampled point must still be present after dragging");
        assert.ok(Math.abs(moved.x - point.x - 100) < 0.1, `${period} zoom=${zoomed}: point moved ${moved.x - point.x}px`);
        assert.equal(moved.primaryY, point.primaryY);
        await drag(-100);
        const returned = await js(`state.historyChartPoints.find(p=>p.timestamp===${point.timestamp})`);
        assert.ok(Math.abs(returned.x - point.x) < 0.1);
        checks.push({ period, zoomed, leftDrag: 100, rightDragIgnored: true, pointMoved: moved.x - point.x, roundTripError: returned.x - point.x });
        const after = await js("getHistoryViewport()");
        assert.ok(Math.abs(after.start - before.start) < 1);
      }
    }
    await js("setHistoryPeriod('day')");
    await settled();
    const initialRange = await js("getHistoryViewport()");
    for (let i = 0; i < 7; i++) await drag(100);
    const crossDate = await js("({view:getHistoryViewport(), loaded:state.historyLoadedRange, pointCount:state.historyChartPoints.length})");
    assert.ok(crossDate.view.end < initialRange.start, "Must pan freely beyond the original date");
    assert.ok(crossDate.loaded.start <= crossDate.view.start && crossDate.loaded.end >= crossDate.view.end);
    assert.ok(crossDate.pointCount > 0, "New dates must load real sample records");
    await js("void loadHistory()");
    await settled();
    assert.deepEqual(await js("getHistoryViewport()"), crossDate.view, "Refresh must not snap back");
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, `history-free-pan-${scale}x.png`), (await window.webContents.capturePage()).toPNG());
    await js("document.getElementById('historyZoomReset').click()");
    await settled();
    assert.equal(await js("state.historyViewport"), null);
    assert.equal(await js("(() => { const event = new MouseEvent('contextmenu', {bubbles:true, cancelable:true, button:2}); el.historyChart.dispatchEvent(event); return event.defaultPrevented; })()"), true);
    assert.deepEqual(errors, []);
    const result = { scale, checks, crossDate, errors };
    fs.writeFileSync(path.join(output, `pan-results-${scale}x.json`), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
    window.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error);
    console.error(JSON.stringify(errors));
    app.exit(1);
  }
}).catch((error) => { console.error(error); app.exit(1); });
