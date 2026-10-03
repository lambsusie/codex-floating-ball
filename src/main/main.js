const { app, BrowserWindow, dialog, ipcMain, shell, Tray, Menu, nativeImage, nativeTheme, net, Notification, screen, powerMonitor } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFile } = require("node:child_process");
const { getQuota, resolveCodexPath, shutdownQuotaService } = require("./quota-service");
const { appendHistory, exportHistoryCsv, readHistoryRange } = require("./history-service");
const { DEFAULT_COMPACT_APPEARANCE, normalizeCompactAppearance } = require("./compact-appearance");
const { checkForUpdate, RELEASES_PAGE_URL } = require("./update-service");
const { getThemeState, normalizeThemeSource } = require("./theme-service");
const { isLive, keepOffTaskbar, attachWindowLifecycle } = require("./window-lifecycle");
const { createTokenReportService } = require("./token-report-service");

const DETAIL_SIZE = { width: 520, height: 360 };
const DEFAULT_WINDOW_MODE = "compact";
const AUTO_REFRESH_OPTIONS = new Set([0, 1, 5, 10, 30, 60]);
const APP_ID = "io.github.lambsusie.codexfloatingball";

let mainWindow;
let tray;
let isAlwaysOnTop = true;
let currentWindowMode = DEFAULT_WINDOW_MODE;
let currentDetailView = "main";
let historyPinned = false;
let compactAlertActive = false;
let compactAppearance = { ...DEFAULT_COMPACT_APPEARANCE };
let saveBoundsTimer;
let availableUpdate;
let themeSource = "system";
let macGlassAvailable = true;
let isQuitting = false;
let taskbarMessage;
let taskbarTimer;
let reportService;
let trayState = "offline";

function sendToWindow(channel, value) {
  if (isLive(mainWindow) && !mainWindow.webContents.isDestroyed()) mainWindow.webContents.send(channel, value);
}

if (process.platform === "win32") app.setAppUserModelId(APP_ID);
const ownsInstance = app.requestSingleInstanceLock();
if (!ownsInstance) app.quit();
else app.on("second-instance", () => { void app.whenReady().then(toggleWindow); });

function createWindow() {
  const initialSize = getWindowSize(currentWindowMode);
  const themeState = getCurrentThemeState();
  const windowOptions = {
    width: initialSize.width,
    height: initialSize.height,
    minWidth: initialSize.width,
    minHeight: initialSize.height,
    frame: false,
    thickFrame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: effectiveAlwaysOnTop(),
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  };
  if (themeState.glassEnabled) {
    windowOptions.vibrancy = "under-window";
    windowOptions.visualEffectState = "active";
  }
  mainWindow = new BrowserWindow(windowOptions);
  const window = mainWindow;
  attachWindowLifecycle(window, {
    isQuitting: () => isQuitting,
    collapse: () => setWindowMode("compact"),
    onClosed: (closed) => {
      if (mainWindow === closed) mainWindow = null;
      currentDetailView = "main";
      historyPinned = false;
      clearTimeout(saveBoundsTimer);
    }
  });
  hookTaskbarRecovery(window);
  mainWindow.setHasShadow(false);
  updateMacWindowEffects(themeState);

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  mainWindow.once("ready-to-show", () => {
    if (!isLive(window)) return;
    window.show();
    keepOffTaskbar(window);
    restoreWindowBounds(currentWindowMode);
  });
  mainWindow.on("moved", scheduleSaveWindowBounds);
  mainWindow.on("resized", scheduleSaveWindowBounds);
  mainWindow.on("blur", () => {
    if (currentWindowMode === "detail" && !isHistoryPinned()) setWindowMode("compact");
  });
}

function placeWindowTopRight() {
  if (!isLive(mainWindow)) return;
  const display = screen.getPrimaryDisplay();
  const { width, height } = mainWindow.getBounds();
  const { workArea } = display;
  mainWindow.setBounds({
    x: workArea.x + workArea.width - width - 24,
    y: workArea.y + 24,
    width,
    height
  });
}

function restoreWindowBounds(mode = currentWindowMode) {
  if (!isLive(mainWindow)) return;
  const savedBounds = readWindowBounds(mode);
  if (savedBounds && isBoundsVisible(savedBounds)) {
    mainWindow.setBounds(savedBounds);
    return;
  }

  placeWindowTopRight();
}

function scheduleSaveWindowBounds() {
  if (!isLive(mainWindow)) return;
  if (saveBoundsTimer) clearTimeout(saveBoundsTimer);
  saveBoundsTimer = setTimeout(() => {
    saveBoundsTimer = undefined;
    saveWindowBounds();
  }, 250);
}

function saveWindowBounds() {
  if (!isLive(mainWindow)) return;
  const settings = readSettings();
  settings.windowBounds = mainWindow.getBounds();
  writeSettings(settings);
}

function readWindowBounds(mode = currentWindowMode) {
  const settings = readSettings();
  const bounds = settings.windowBounds;
  if (!bounds) return null;
  const { x, y } = bounds;
  if (![x, y].every(Number.isFinite)) return null;
  const size = getWindowSize(mode);
  return { x, y, width: size.width, height: size.height };
}

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(getSettingsPath(), "utf8"));
  } catch {
    return {};
  }
}

function getSettingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function getHistoryPath() {
  return path.join(app.getPath("userData"), "quota-history.ndjson");
}

async function exportHistory(language) {
  const date = new Date().toISOString().slice(0, 10);
  const isEnglish = language === "en";
  const result = await dialog.showSaveDialog(mainWindow, {
    title: isEnglish ? "Export Codex quota history" : "导出 Codex 额度记录",
    defaultPath: path.join(app.getPath("downloads"), `Codex-quota-history-${date}.csv`),
    filters: [{ name: "CSV", extensions: ["csv"] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  const outputPath = path.extname(result.filePath).toLowerCase() === ".csv" ? result.filePath : `${result.filePath}.csv`;
  return { canceled: false, ...exportHistoryCsv(getHistoryPath(), outputPath) };
}

function writeSettings(settings) {
  fs.mkdirSync(app.getPath("userData"), { recursive: true });
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), "utf8");
}

function getCurrentThemeState() {
  const state = getThemeState(nativeTheme, process.platform, themeSource);
  return state.glassEnabled && !macGlassAvailable ? { ...state, glassEnabled: false } : state;
}

function broadcastThemeState() {
  const state = getCurrentThemeState();
  updateMacWindowEffects(state);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("theme:changed", state);
  }
  return state;
}

function setThemeSource(value) {
  themeSource = normalizeThemeSource(value);
  nativeTheme.themeSource = themeSource;
  const settings = readSettings();
  settings.themeSource = themeSource;
  writeSettings(settings);
  return broadcastThemeState();
}

function updateMacWindowEffects(state = getCurrentThemeState()) {
  if (process.platform !== "darwin" || !mainWindow || mainWindow.isDestroyed()) return;
  try {
    mainWindow.setVibrancy(state.glassEnabled ? "under-window" : null);
    mainWindow.setBackgroundColor("#00000000");
  } catch {
    macGlassAvailable = false;
    mainWindow.webContents.send("theme:changed", getCurrentThemeState());
  }
}

function getAutoRefreshMinutes() {
  const value = Number(readSettings().autoRefreshMinutes ?? 5);
  return AUTO_REFRESH_OPTIONS.has(value) ? value : 5;
}

function setAutoRefreshMinutes(value) {
  const minutes = Number(value);
  if (!AUTO_REFRESH_OPTIONS.has(minutes)) {
    throw new Error(`Unsupported auto refresh interval: ${value}`);
  }

  const settings = readSettings();
  settings.autoRefreshMinutes = minutes;
  writeSettings(settings);
  return minutes;
}

function getWindowMode() {
  return currentWindowMode;
}

function getWindowSize(mode = currentWindowMode) {
  if (mode === "detail") return DETAIL_SIZE;
  const padding = 12;
  const alertWidth = compactAlertActive ? 94 : 0;
  return {
    width: compactAppearance.ballSize + padding + alertWidth,
    height: compactAppearance.ballSize + padding
  };
}

function setWindowMode(mode) {
  if (mode !== "compact" && mode !== "detail") {
    throw new Error(`Unsupported window mode: ${mode}`);
  }

  currentWindowMode = mode;
  if (mode === "compact") setDetailView("main");
  applyWindowPinning();
  if (!isLive(mainWindow)) return currentWindowMode;

  const size = getWindowSize(mode);
  const nextBounds = resizeFromRightEdge(mainWindow.getBounds(), size);
  mainWindow.setMinimumSize(size.width, size.height);
  mainWindow.setBounds(clampBoundsToDisplay(nextBounds));
  mainWindow.webContents.send("window:modeChanged", currentWindowMode);
  saveWindowBounds();
  rebuildTrayMenu();
  return currentWindowMode;
}

function getCompactAppearance() {
  return { ...compactAppearance };
}

function setCompactAppearance(value) {
  compactAppearance = normalizeCompactAppearance(value);
  const settings = readSettings();
  settings.compactAppearance = compactAppearance;
  writeSettings(settings);

  if (isLive(mainWindow) && currentWindowMode === "compact") {
    const size = getWindowSize("compact");
    const nextBounds = resizeFromRightEdge(mainWindow.getBounds(), size);
    mainWindow.setMinimumSize(size.width, size.height);
    mainWindow.setBounds(clampBoundsToDisplay(nextBounds));
    saveWindowBounds();
  }
  sendToWindow("settings:compactAppearanceChanged", compactAppearance);
  return getCompactAppearance();
}

function setCompactAlert(value) {
  const nextValue = Boolean(value);
  if (compactAlertActive === nextValue) return compactAlertActive;

  compactAlertActive = nextValue;
  if (isLive(mainWindow) && currentWindowMode === "compact") {
    const size = getWindowSize("compact");
    const nextBounds = resizeFromRightEdge(mainWindow.getBounds(), size);
    mainWindow.setMinimumSize(size.width, size.height);
    mainWindow.setBounds(clampBoundsToDisplay(nextBounds));
    saveWindowBounds();
  }

  return compactAlertActive;
}

function moveWindowBy(dx, dy) {
  if (!isLive(mainWindow)) return null;
  const deltaX = Math.round(Number(dx));
  const deltaY = Math.round(Number(dy));
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return mainWindow.getBounds();

  const bounds = mainWindow.getBounds();
  const nextBounds = clampBoundsToDisplay({
    ...bounds,
    x: bounds.x + deltaX,
    y: bounds.y + deltaY
  });
  mainWindow.setBounds(nextBounds);
  return nextBounds;
}

function resizeFromRightEdge(bounds, size) {
  return {
    x: bounds.x + bounds.width - size.width,
    y: bounds.y,
    width: size.width,
    height: size.height
  };
}

function clampBoundsToDisplay(bounds) {
  const display = screen.getDisplayMatching(bounds);
  const area = display.workArea;
  const margin = 8;
  const maxX = area.x + area.width - bounds.width - margin;
  const maxY = area.y + area.height - bounds.height - margin;

  return {
    ...bounds,
    x: Math.max(area.x + margin, Math.min(bounds.x, maxX)),
    y: Math.max(area.y + margin, Math.min(bounds.y, maxY))
  };
}

function isBoundsVisible(bounds) {
  return screen.getAllDisplays().some((display) => {
    const area = display.workArea;
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    return centerX >= area.x && centerX <= area.x + area.width && centerY >= area.y && centerY <= area.y + area.height;
  });
}

function getTrayIcon() {
  const assetName = process.platform === "darwin"
    ? "trayTemplate.png"
    : `tray-${trayState}.${process.platform === "win32" ? "ico" : "png"}`;
  let icon = nativeImage.createFromPath(path.join(__dirname, "../../assets", assetName));
  if (icon.isEmpty()) {
    icon = nativeImage.createFromPath(path.join(__dirname, "../../assets/tray-icon.png"));
  }
  if (process.platform === "darwin") icon.setTemplateImage(true);
  return icon;
}

function setTrayState(value) {
  const next = ["normal", "warning", "error", "offline"].includes(value) ? value : "offline";
  if (next === trayState) return;
  trayState = next;
  if (tray && !tray.isDestroyed()) {
    tray.setImage(getTrayIcon());
    tray.setToolTip(`Codex Floating Ball (${next})`);
  }
}

function createTray() {
  tray = new Tray(getTrayIcon());
  tray.setToolTip("Codex Quota Widget");
  rebuildTrayMenu();
  tray.on("click", toggleWindow);
}

function rebuildTrayMenu() {
  if (!tray || tray.isDestroyed()) return;
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: currentWindowMode === "detail" ? "收起为悬浮球" : "显示完整面板", click: toggleWindow },
      { label: "刷新额度", click: () => {
        if (!isLive(mainWindow)) createWindow();
        else sendToWindow("quota:refresh");
      } },
      {
        label: isAlwaysOnTop ? "取消置顶" : "置顶",
        click: () => setAlwaysOnTop(!isAlwaysOnTop)
      },
      { type: "separator" },
      { label: "退出", click: () => app.quit() }
    ])
  );
}

function setAlwaysOnTop(value) {
  isAlwaysOnTop = Boolean(value);
  if (isLive(mainWindow)) {
    applyWindowPinning();
    mainWindow.webContents.send("window:alwaysOnTopChanged", isAlwaysOnTop);
  }
  rebuildTrayMenu();
  return isAlwaysOnTop;
}

function isHistoryPinned() {
  return currentWindowMode === "detail" && currentDetailView === "history" && historyPinned;
}

function effectiveAlwaysOnTop() {
  return currentWindowMode === "detail" && currentDetailView === "history" ? historyPinned : isAlwaysOnTop;
}

function applyWindowPinning() {
  if (isLive(mainWindow)) mainWindow.setAlwaysOnTop(effectiveAlwaysOnTop());
}

function setDetailView(value) {
  currentDetailView = ["settings", "history", "reports"].includes(value) ? value : "main";
  if (currentDetailView !== "history") historyPinned = false;
  applyWindowPinning();
  sendToWindow("window:historyPinnedChanged", historyPinned);
  return historyPinned;
}

function setHistoryPinned(value) {
  historyPinned = currentWindowMode === "detail" && currentDetailView === "history" && Boolean(value);
  applyWindowPinning();
  sendToWindow("window:historyPinnedChanged", historyPinned);
  return historyPinned;
}

function toggleWindow() {
  if (!isLive(mainWindow)) {
    currentWindowMode = "detail";
    createWindow();
    return;
  }
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  setWindowMode(currentWindowMode === "detail" ? "compact" : "detail");
  mainWindow.focus();
  keepOffTaskbar(mainWindow);
}

function hookTaskbarRecovery(window) {
  if (!taskbarMessage || !isLive(window)) return;
  window.hookWindowMessage(taskbarMessage, () => {
    keepOffTaskbar(window);
    setTimeout(() => keepOffTaskbar(window), 500).unref();
  });
}

function startTaskbarRecovery() {
  if (process.platform !== "win32") return;
  // Explorer broadcasts this registered message after rebuilding its taskbar.
  const script = 'Add-Type -TypeDefinition \'using System.Runtime.InteropServices; public class ShellMessage { [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern uint RegisterWindowMessage(string name); }\'; [ShellMessage]::RegisterWindowMessage("TaskbarCreated")';
  execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script],
    { windowsHide: true, timeout: 10000 }, (error, output) => {
      const value = Number(output?.trim());
      if (error || isQuitting || !Number.isInteger(value) || value < 0xc000 || value > 0xffff) return;
      taskbarMessage = value;
      hookTaskbarRecovery(mainWindow);
    });
  // Fallback for missed shell broadcasts or delayed Explorer startup.
  taskbarTimer = setInterval(() => keepOffTaskbar(mainWindow), 2000);
  taskbarTimer.unref();
}

async function getLatestUpdate() {
  const result = await checkForUpdate({ currentVersion: app.getVersion(), fetchImpl: net.fetch });
  availableUpdate = result.updateAvailable ? result : undefined;
  return result;
}

function showUpdateNotification(language) {
  if (!availableUpdate || !Notification.isSupported()) return false;
  const update = availableUpdate;
  const isEnglish = language === "en";
  const notification = new Notification({
    title: isEnglish ? "Codex Floating Ball update" : "Codex Floating Ball 有新版本",
    body: isEnglish
      ? `Version ${update.latestVersion} is available. Click to view the download.`
      : `v${update.latestVersion} 已发布，点击查看下载。`
  });
  notification.on("click", () => shell.openExternal(update.releaseUrl));
  notification.show();
  return true;
}

app.whenReady().then(() => {
  if (!ownsInstance) return;
  if (process.platform === "darwin") app.dock?.hide();
  const settings = readSettings();
  compactAppearance = normalizeCompactAppearance(settings.compactAppearance);
  themeSource = normalizeThemeSource(settings.themeSource);
  nativeTheme.themeSource = themeSource;
  createWindow();
  createTray();
  startTaskbarRecovery();
  reportService = createTokenReportService({
    userData: app.getPath("userData"),
    codexHome: process.env.CODEX_HOME || path.join(os.homedir(), ".codex"),
    onUpdated: () => sendToWindow("reports:updated")
  });
  reportService.start();
  powerMonitor.on("resume", () => {
    reportService.resume();
    keepOffTaskbar(mainWindow);
  });
  nativeTheme.on("updated", broadcastThemeState);

  ipcMain.handle("quota:get", async () => getQuota());
  ipcMain.handle("window:minimize", () => setWindowMode("compact"));
  ipcMain.handle("window:close", () => app.quit());
  ipcMain.handle("window:alwaysOnTop:get", () => isAlwaysOnTop);
  ipcMain.handle("window:alwaysOnTop:set", (_event, value) => setAlwaysOnTop(value));
  ipcMain.handle("window:detailView:set", (_event, value) => setDetailView(value));
  ipcMain.handle("window:historyPinned:set", (_event, value) => setHistoryPinned(value));
  ipcMain.handle("window:mode:get", () => getWindowMode());
  ipcMain.handle("window:mode:set", (_event, mode) => setWindowMode(mode));
  ipcMain.handle("window:compactAlert:set", (_event, value) => setCompactAlert(value));
  ipcMain.handle("window:moveBy", (_event, dx, dy) => moveWindowBy(dx, dy));
  ipcMain.handle("settings:autoRefresh:get", () => getAutoRefreshMinutes());
  ipcMain.handle("settings:autoRefresh:set", (_event, minutes) => setAutoRefreshMinutes(minutes));
  ipcMain.handle("settings:compactAppearance:get", () => getCompactAppearance());
  ipcMain.handle("settings:compactAppearance:set", (_event, value) => setCompactAppearance(value));
  ipcMain.handle("theme:get", () => getCurrentThemeState());
  ipcMain.handle("theme:set", (_event, value) => setThemeSource(value));
  ipcMain.handle("history:record", (_event, quota) => appendHistory(getHistoryPath(), quota));
  ipcMain.handle("history:get", (_event, range) => readHistoryRange(getHistoryPath(), range?.start, range?.end,
    Math.max(2400, Math.min(100000, Number(range?.maxPoints) || 2400))));
  ipcMain.handle("history:export", (_event, language) => exportHistory(language));
  ipcMain.handle("reports:get", (_event, query) => reportService.getReport(query));
  ipcMain.handle("reports:refresh", () => reportService.refresh());
  ipcMain.handle("tray:state", (_event, value) => setTrayState(value));
  ipcMain.handle("app:version", () => app.getVersion());
  ipcMain.handle("updates:check", () => getLatestUpdate());
  ipcMain.handle("updates:notify", (_event, language) => showUpdateNotification(language));
  ipcMain.handle("updates:open", () => shell.openExternal(availableUpdate?.releaseUrl || RELEASES_PAGE_URL));
  ipcMain.handle("external:openCodex", () => {
    shell.openPath(resolveCodexPath());
  });

  app.on("activate", () => {
    if (!isLive(mainWindow)) createWindow();
    else { mainWindow.show(); keepOffTaskbar(mainWindow); }
  });
});

app.on("window-all-closed", () => {});

app.on("before-quit", () => {
  isQuitting = true;
  clearTimeout(saveBoundsTimer);
  clearInterval(taskbarTimer);
  reportService?.stop();
  shutdownQuotaService();
});
