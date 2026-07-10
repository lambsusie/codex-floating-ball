const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, screen } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { getQuota, resolveCodexPath } = require("./quota-service");

const COMPACT_SIZE = { width: 132, height: 132 };
const COMPACT_ALERT_SIZE = { width: 226, height: 132 };
const DETAIL_SIZE = { width: 520, height: 360 };
const WINDOW_MODES = {
  compact: COMPACT_SIZE,
  detail: DETAIL_SIZE
};
const DEFAULT_WINDOW_MODE = "compact";
const AUTO_REFRESH_OPTIONS = new Set([0, 1, 5, 10, 30, 60]);

let mainWindow;
let tray;
let isAlwaysOnTop = true;
let currentWindowMode = DEFAULT_WINDOW_MODE;
let compactAlertActive = false;
let saveBoundsTimer;

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
      nodeIntegration: false
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
  if (mode === "compact" && compactAlertActive) return COMPACT_ALERT_SIZE;
  return WINDOW_MODES[mode] || WINDOW_MODES[DEFAULT_WINDOW_MODE];
}

function setWindowMode(mode) {
  if (!Object.prototype.hasOwnProperty.call(WINDOW_MODES, mode)) {
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

app.whenReady().then(() => {
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
