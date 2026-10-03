const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const assert = require("node:assert/strict");
const scale = process.env.CFB_TEST_SCALE || "1";
app.commandLine.appendSwitch("force-device-scale-factor", scale);
app.setPath("userData", fs.mkdtempSync(path.join(os.tmpdir(), "floating-ball-v121-ui-")));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const output = path.join(__dirname, "../qa-v1.2.1");
const target = process.env.CFB_TEST_APP_ROOT || path.join(__dirname, "..");
app.whenReady().then(async () => {
  const window = new BrowserWindow({ width: 520, height: 360, frame: false, show: false, skipTaskbar: true,
    webPreferences: { preload: path.join(__dirname, "visual-smoke-preload.js"), contextIsolation: true } });
  const js = (code) => window.webContents.executeJavaScript(code);
  const run = (code) => js(`(async () => { ${code} })()`);
  const errors = [];
  window.webContents.on("console-message", (_e, level, message) => { if (level >= 3) errors.push(message); });
  const capture = async (name) => {
    await wait(120);
    fs.writeFileSync(path.join(output, `${name}-${scale}x.png`), (await window.webContents.capturePage()).toPNG());
  };
  const controlsFit = async (selector) => js(`(() => {
    const panel=document.querySelector('${selector}');
    const controls=[...panel.querySelectorAll('button,select')].filter(e=>e.getBoundingClientRect().width>0);
    return controls.every(e=>{const r=e.getBoundingClientRect();return r.left>=0 && r.right<=520 && r.bottom<=360;});
  })()`);
  try {
    fs.mkdirSync(output, { recursive: true });
    await window.loadFile(path.join(target, "src/renderer/index.html"));
    await wait(400);
    await js("setAutoCheckUpdates(false)");
    for (const lang of ["zh", "en"]) {
      for (const theme of ["light", "dark"]) {
        await run(`setLanguage('${lang}'); await setTheme('${theme}'); state.historyViewport=null; updateDetailView('history');`);
        await wait(150);
        assert.equal(await controlsFit("#historyPanel"), true);
        assert.equal(await js("getComputedStyle(el.pinBtn).display"), "none");
        await capture(`chart-${lang}-${theme}`);
        const ranges = await js(`(() => {
          const results=[];
          for(const minutes of [44640,10080,1440,300,60,11,10,5,1]) {
            const end=Date.now();state.historyViewport={start:end-minutes*60000,end};drawHistoryChart();
            results.push({minutes,axis:state.historyAxis,plot:state.historyPlot});
          }
          return results;
        })()`);
        for (const result of ranges) {
          assert.equal(Boolean(result.axis.minuteOnly), result.minutes <= 10);
          assert.ok(result.axis.ticks.length >= 3);
          assert.deepEqual(result.plot, ranges[0].plot, "Y coordinates must stay fixed during zoom");
        }
        await js("state.historyViewport={start:new Date(2026,9,2,14,5).getTime(),end:new Date(2026,9,2,14,15).getTime()}; void loadHistory()");
        await wait(150);
        await capture(`chart-minutes-${lang}-${theme}`);
        await js("updateDetailView('settings'); document.querySelector('.settings-scroll').scrollTop=100;");
        const settingFits = await js(`(() => {const r=el.defaultDetailViewSelect.getBoundingClientRect();const row=el.defaultDetailViewSelect.closest('label');return r.right<=520 && r.left>0 && row.scrollWidth<=row.clientWidth;})()`);
        assert.equal(settingFits, true);
        await capture(`default-page-${lang}-${theme}`);
      }
    }
    await run("setLanguage('zh'); await setTheme('light'); updateDetailView('history'); updateHistoryPinButton(true);");
    await wait(150);
    await capture("chart-pinned");
    assert.deepEqual(errors, []);
    const result = { source: target.includes("app.asar") ? "packaged-asar" : "source", scale, languageThemeLayouts: 4, timeSpans: 9, minuteLabels: true, stableYAxis: true, errors };
    fs.writeFileSync(path.join(output, `ui-results-${scale}x.json`), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
    window.destroy(); app.exit(0);
  } catch (error) { console.error(error); console.error(errors); app.exit(1); }
});
setTimeout(() => { console.error("UI test timeout"); app.exit(1); }, 45000).unref();
