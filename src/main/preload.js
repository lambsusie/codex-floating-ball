const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("codexQuota", {
  getQuota: () => ipcRenderer.invoke("quota:get"),
  minimize: () => ipcRenderer.invoke("window:minimize"),
  close: () => ipcRenderer.invoke("window:close"),
  getAlwaysOnTop: () => ipcRenderer.invoke("window:alwaysOnTop:get"),
  setAlwaysOnTop: (value) => ipcRenderer.invoke("window:alwaysOnTop:set", value),
  getWindowMode: () => ipcRenderer.invoke("window:mode:get"),
  setWindowMode: (mode) => ipcRenderer.invoke("window:mode:set", mode),
  setCompactAlert: (value) => ipcRenderer.invoke("window:compactAlert:set", value),
  moveWindowBy: (dx, dy) => ipcRenderer.invoke("window:moveBy", dx, dy),
  getAutoRefreshMinutes: () => ipcRenderer.invoke("settings:autoRefresh:get"),
  setAutoRefreshMinutes: (minutes) => ipcRenderer.invoke("settings:autoRefresh:set", minutes),
  getCompactAppearance: () => ipcRenderer.invoke("settings:compactAppearance:get"),
  setCompactAppearance: (value) => ipcRenderer.invoke("settings:compactAppearance:set", value),
  recordHistory: (quota) => ipcRenderer.invoke("history:record", quota),
  getHistory: (range) => ipcRenderer.invoke("history:get", range),
  openCodex: () => ipcRenderer.invoke("external:openCodex"),
  onRefresh: (callback) => {
    ipcRenderer.on("quota:refresh", callback);
  },
  onAlwaysOnTopChanged: (callback) => {
    ipcRenderer.on("window:alwaysOnTopChanged", (_event, value) => callback(value));
  },
  onWindowModeChanged: (callback) => {
    ipcRenderer.on("window:modeChanged", (_event, mode) => callback(mode));
  }
});
