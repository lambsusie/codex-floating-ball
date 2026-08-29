const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, net, Notification, screen } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { getQuota, resolveCodexPath, shutdownQuotaService } = require("./quota-service");
const { appendHistory, readHistoryRange } = require("./history-service");
const { DEFAULT_COMPACT_APPEARANCE, normalizeCompactAppearance } = require("./compact-appearance");
const { checkForUpdate, RELEASES_PAGE_URL } = require("./update-service");

const DETAIL_SIZE = { width: 520, height: 360 };
const DEFAULT_WINDOW_MODE = "compact";
const AUTO_REFRESH_OPTIONS = new Set([0, 1, 5, 10, 30, 60]);
const APP_ID = "io.github.lambsusie.codexfloatingball";

let mainWindow;
let tray;
let isAlwaysOnTop = true;
let currentWindowMode = DEFAULT_WINDOW_MODE;
let compactAlertActive = false;
let compactAppearance = { ...DEFAULT_COMPACT_APPEARANCE };
let saveBoundsTimer;
let availableUpdate;

if (process.platform === "win32") app.setAppUserModelId(APP_ID);

function createWindow() {
  const initialSize = getWindowSize(currentWindowMode);
  mainWindow = new BrowserWindow({
    width: initialSize.width,
    height: initialSize.height,
    minWidth: initialSize.width,
    minHeight: initialSize.height,
    frame: false,
    thickFrame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: isAlwaysOnTop,
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
  });
  mainWindow.setHasShadow(false);

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    restoreWindowBounds(currentWindowMode);
  });
  mainWindow.on("moved", scheduleSaveWindowBounds);
  mainWindow.on("resized", scheduleSaveWindowBounds);
  mainWindow.on("blur", () => {
    if (currentWindowMode === "detail") setWindowMode("compact");
  });
}

function placeWindowTopRight() {
  if (!mainWindow) return;
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
  if (!mainWindow) return;
  const savedBounds = readWindowBounds(mode);
  if (savedBounds && isBoundsVisible(savedBounds)) {
    mainWindow.setBounds(savedBounds);
    return;
  }

  placeWindowTopRight();
}

function scheduleSaveWindowBounds() {
  if (!mainWindow) return;
  if (saveBoundsTimer) clearTimeout(saveBoundsTimer);
  saveBoundsTimer = setTimeout(() => {
    saveBoundsTimer = undefined;
    saveWindowBounds();
  }, 250);
}

function saveWindowBounds() {
  if (!mainWindow) return;
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

function writeSettings(settings) {
  fs.mkdirSync(app.getPath("userData"), { recursive: true });
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), "utf8");
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
  if (!mainWindow) return currentWindowMode;

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

  if (mainWindow && currentWindowMode === "compact") {
    const size = getWindowSize("compact");
    const nextBounds = resizeFromRightEdge(mainWindow.getBounds(), size);
    mainWindow.setMinimumSize(size.width, size.height);
    mainWindow.setBounds(clampBoundsToDisplay(nextBounds));
    saveWindowBounds();
  }
  mainWindow?.webContents.send("settings:compactAppearanceChanged", compactAppearance);
  return getCompactAppearance();
}

function setCompactAlert(value) {
  const nextValue = Boolean(value);
  if (compactAlertActive === nextValue) return compactAlertActive;

  compactAlertActive = nextValue;
  if (mainWindow && currentWindowMode === "compact") {
    const size = getWindowSize("compact");
    const nextBounds = resizeFromRightEdge(mainWindow.getBounds(), size);
    mainWindow.setMinimumSize(size.width, size.height);
    mainWindow.setBounds(clampBoundsToDisplay(nextBounds));
    saveWindowBounds();
  }

  return compactAlertActive;
}

function moveWindowBy(dx, dy) {
  if (!mainWindow) return null;
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

function createTray() {
  const icon = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAK0lEQVR42mNk+M9Qz0AEYBxVSFUBCzAyMjL8Z2BgYJjFqIGjBo4aOAIAgV4EfpO0k7EAAAAASUVORK5CYII="
  );
  if (process.platform === "darwin") icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setToolTip("Codex Quota Widget");
  rebuildTrayMenu();
  tray.on("click", toggleWindow);
}

function rebuildTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: currentWindowMode === "detail" ? "收起为悬浮球" : "显示完整面板", click: toggleWindow },
      { label: "刷新额度", click: () => mainWindow?.webContents.send("quota:refresh") },
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
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(isAlwaysOnTop);
    mainWindow.webContents.send("window:alwaysOnTopChanged", isAlwaysOnTop);
  }
  rebuildTrayMenu();
  return isAlwaysOnTop;
}

function toggleWindow() {
  if (!mainWindow) return;
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  setWindowMode(currentWindowMode === "detail" ? "compact" : "detail");
  mainWindow.focus();
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
  if (process.platform === "darwin") app.dock?.hide();
  compactAppearance = normalizeCompactAppearance(readSettings().compactAppearance);
  createWindow();
  createTray();

  ipcMain.handle("quota:get", async () => getQuota());
  ipcMain.handle("window:minimize", () => setWindowMode("compact"));
  ipcMain.handle("window:close", () => app.quit());
  ipcMain.handle("window:alwaysOnTop:get", () => isAlwaysOnTop);
  ipcMain.handle("window:alwaysOnTop:set", (_event, value) => setAlwaysOnTop(value));
  ipcMain.handle("window:mode:get", () => getWindowMode());
  ipcMain.handle("window:mode:set", (_event, mode) => setWindowMode(mode));
  ipcMain.handle("window:compactAlert:set", (_event, value) => setCompactAlert(value));
  ipcMain.handle("window:moveBy", (_event, dx, dy) => moveWindowBy(dx, dy));
  ipcMain.handle("settings:autoRefresh:get", () => getAutoRefreshMinutes());
  ipcMain.handle("settings:autoRefresh:set", (_event, minutes) => setAutoRefreshMinutes(minutes));
  ipcMain.handle("settings:compactAppearance:get", () => getCompactAppearance());
  ipcMain.handle("settings:compactAppearance:set", (_event, value) => setCompactAppearance(value));
  ipcMain.handle("history:record", (_event, quota) => appendHistory(getHistoryPath(), quota));
  ipcMain.handle("history:get", (_event, range) => readHistoryRange(getHistoryPath(), range?.start, range?.end));
  ipcMain.handle("app:version", () => app.getVersion());
  ipcMain.handle("updates:check", () => getLatestUpdate());
  ipcMain.handle("updates:notify", (_event, language) => showUpdateNotification(language));
  ipcMain.handle("updates:open", () => shell.openExternal(availableUpdate?.releaseUrl || RELEASES_PAGE_URL));
  ipcMain.handle("external:openCodex", () => {
    shell.openPath(resolveCodexPath());
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", (event) => {
  event.preventDefault();
});

app.on("before-quit", shutdownQuotaService);
