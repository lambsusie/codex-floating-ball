const { app, BrowserWindow, Tray } = require("electron");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");

// Run the real main/preload/renderer stack with isolated data and synthetic quota.
const root = fs.mkdtempSync(path.join(os.tmpdir(), "floating-ball-integration-"));
const target = process.env.CFB_TEST_APP_ROOT || path.join(__dirname, "..");
app.setPath("userData", path.join(root, "userData"));
process.env.CODEX_HOME = path.join(root, "codex");
fs.mkdirSync(path.join(process.env.CODEX_HOME, "sessions"), { recursive: true });
const previousDay = Date.now() - 86400000;
fs.writeFileSync(path.join(process.env.CODEX_HOME, "sessions", "test.jsonl"), [
  { type: "session_meta", payload: { id: "synthetic" } },
  { type: "token_usage_record", timestamp: new Date(previousDay).toISOString(), payload: {
    thread_id: "synthetic", response_id: "synthetic-request", usage: { input_tokens: 1000, output_tokens: 100, cached_input_tokens: 800, reasoning_output_tokens: 50, total_tokens: 1100 }
  } }
].map((row) => JSON.stringify(row)).join("\n") + "\n");
const quota = require(path.join(target, "src/main/quota-service"));
let quotaCalls = 0;
quota.getQuota = async () => ({ fetchedAt: Date.now() + quotaCalls++, planType: "plus",
  primary: { remainingPercent: 68, usedPercent: 32, resetsAt: Date.now() + 3600000 },
  secondary: { remainingPercent: 32, usedPercent: 68, resetsAt: Date.now() + 86400000 } });
require(path.join(target, "src/main/update-service")).checkForUpdate = async () => ({ updateAvailable: false, currentVersion: "1.2.1" });
let tray;
const trayOn = Tray.prototype.on;
Tray.prototype.on = function (name, listener) { if (name === "click") tray = this; return trayOn.call(this, name, listener); };
// Keep all test windows hidden; do not interrupt the user's desktop.
BrowserWindow.prototype.show = function () {};
BrowserWindow.prototype.focus = function () {};
const originalSkip = BrowserWindow.prototype.setSkipTaskbar;
let skipCalls = 0;
BrowserWindow.prototype.setSkipTaskbar = function (value) { if (value) skipCalls++; return originalSkip.call(this, value); };
let shellCallbacks = 0;
const originalHook = BrowserWindow.prototype.hookWindowMessage;
BrowserWindow.prototype.hookWindowMessage = function (message, callback) {
  return originalHook.call(this, message, (...args) => { shellCallbacks++; callback(...args); });
};
const errors = [];
app.on("web-contents-created", (_e, contents) => contents.on("console-message", (_ev, level, message) => {
  if (level >= 3) errors.push(message);
}));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (check) => {
  for (let i = 0; i < 100; i++) { if (await check()) return; await wait(100); }
  throw new Error("Integration wait timed out");
};
require(path.join(target, "src/main/main"));

app.whenReady().then(async () => {
  try {
    await until(() => BrowserWindow.getAllWindows()[0]?.webContents.getURL().includes("index.html"));
    let window = BrowserWindow.getAllWindows()[0];
    await until(async () => !window.webContents.isLoading() && await window.webContents.executeJavaScript("document.getElementById('remaining')?.textContent === '68%'"));
    await until(() => fs.existsSync(path.join(root, "userData/token-reports.json")));
    const report = await window.webContents.executeJavaScript("window.codexQuota.getReport({period:'day', anchor:new Date(Date.now()-86400000+8*3600000).toISOString().slice(0,10)})");
    assert.equal(report.totals.total_tokens, 1100);
    assert.equal(report.sourceStatus, "ready");
    const js = (code) => window.webContents.executeJavaScript(code);
    const run = (code) => js(`(async () => { ${code} })()`);
    assert.equal(await js("state.defaultDetailView"), "main");
    for (const view of ["history", "reports", "main"]) {
      await run(`setDefaultDetailView('${view}'); await setWindowMode('compact'); el.compactBall.click();`);
      await until(async () => await js(`state.mode === 'detail' && state.view === '${view}'`));
      assert.equal(await js("document.body.dataset.view"), view);
    }
    await js("setWindowMode('compact')");
    const beforeRefresh = quotaCalls;
    await js("el.compactBall.click(); el.compactBall.click()");
    await until(() => quotaCalls > beforeRefresh);
    await wait(300);
    assert.equal(await js("state.mode"), "compact", "Double-click still refreshes without opening a page");
    await run("setDefaultDetailView('history'); await setWindowMode('detail')");
    await new Promise((resolve) => { window.webContents.once("did-finish-load", resolve); window.webContents.reload(); });
    await until(async () => await js("state.lastQuota && state.view === 'history'"));
    assert.equal(await js("state.defaultDetailView"), "history", "Default page survives renderer restart");
    for (const ballPinned of [true, false]) {
      await run(`await window.codexQuota.setAlwaysOnTop(${ballPinned}); await setWindowMode('detail'); updateDetailView('history');`);
      await run("await window.codexQuota.setDetailView('history'); el.historyPinBtn.click()");
      await until(async () => window.isAlwaysOnTop() && await js("state.historyPinned"));
      window.emit("blur");
      await wait(60);
      assert.equal(await js("state.mode"), "detail", "Pinned chart must survive focus loss");
      assert.equal(await js("window.codexQuota.getAlwaysOnTop()"), ballPinned);
      await js("el.historyPinBtn.click()");
      await until(async () => !window.isAlwaysOnTop() && !await js("state.historyPinned"));
      window.emit("blur");
      await until(async () => await js("state.mode === 'compact'"));
      assert.equal(window.isAlwaysOnTop(), ballPinned, "Collapse restores the ball's own pin setting");
    }
    await run("await setWindowMode('detail'); await window.codexQuota.setDetailView('history'); await window.codexQuota.setHistoryPinned(true); updateDetailView('reports');");
    await until(async () => !window.isAlwaysOnTop() && !await js("state.historyPinned"));
    window.emit("blur");
    await until(async () => await js("state.mode === 'compact'"));
    await window.webContents.executeJavaScript("window.codexQuota.setWindowMode('detail')");
    window.close();
    await wait(100);
    assert.equal(window.isDestroyed(), false);
    assert.equal(await window.webContents.executeJavaScript("window.codexQuota.getWindowMode()"), "compact");
    window.destroy();
    assert.equal(BrowserWindow.getAllWindows().length, 0);
    tray.emit("click");
    await until(() => BrowserWindow.getAllWindows()[0]?.webContents.getURL().includes("index.html"));
    window = BrowserWindow.getAllWindows()[0];
    await until(async () => !window.webContents.isLoading() && await window.webContents.executeJavaScript("document.getElementById('remaining')?.textContent === '68%'"));
    assert.equal(await window.webContents.executeJavaScript("window.codexQuota.getWindowMode()"), "detail");
    if (process.platform === "win32") {
      await wait(2000);
      const handle = window.getNativeWindowHandle();
      const hwnd = handle.length === 8 ? handle.readBigUInt64LE().toString() : handle.readUInt32LE().toString();
      const script = `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class SmokeShell { [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern uint RegisterWindowMessage(string name); [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hwnd,uint msg,IntPtr w,IntPtr l); }'; [SmokeShell]::PostMessage([IntPtr]${hwnd},[SmokeShell]::RegisterWindowMessage("TaskbarCreated"),[IntPtr]::Zero,[IntPtr]::Zero)`;
      const before = skipCalls;
      await new Promise((resolve, reject) => execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true, timeout: 10000 }, (error) => error ? reject(error) : resolve()));
      await until(() => shellCallbacks > 0 && skipCalls > before);
    }
    for (const value of ["normal", "warning", "error", "offline"]) {
      await window.webContents.executeJavaScript(`window.codexQuota.setTrayState('${value}')`);
      assert.equal(tray.isDestroyed(), false);
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ source: target.includes("app.asar") ? "packaged-asar" : "source", reports: true,
      defaultPages: 3, defaultPagePersisted: true, doubleClickRefresh: true, independentChartPin: true, blurCollapseRestored: true,
      taskbarCloseCollapsed: true, trayRecreatedDestroyedWindow: true, shellRecovery: shellCallbacks > 0, trayStates: 4, errors }));
    app.quit();
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
setTimeout(() => { console.error("Integration overall timeout"); app.exit(1); }, 45000).unref();
