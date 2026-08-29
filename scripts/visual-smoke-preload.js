const { contextBridge } = require("electron");

function normalizeCompactAppearance(value = {}) {
  return {
    ballSize: Number(value.ballSize) || 120,
    quotaFontSize: Number(value.quotaFontSize) || 27,
    resetFontSize: Number(value.resetFontSize) || 11
  };
}

const now = Date.now();
const quota = {
  fetchedAt: now,
  remainingPercent: 62,
  planType: "plus",
  primary: {
    remainingPercent: 62,
    usedPercent: 38,
    resetsAt: now + 2.5 * 3600000
  },
  secondary: {
    remainingPercent: 34,
    usedPercent: 66,
    resetsAt: now + 4 * 86400000
  }
};

function getHistory(range) {
  const points = [];
  const span = range.end - range.start;
  for (let index = 0; index < 20; index += 1) {
    points.push({
      timestamp: range.start + (span * index) / 19,
      primaryRemaining: 96 - ((index * 8) % 82),
      secondaryRemaining: 82 - index * 1.8
    });
  }
  return points;
}

contextBridge.exposeInMainWorld("codexQuota", {
  getQuota: async () => quota,
  minimize: async () => "compact",
  close: async () => {},
  getAlwaysOnTop: async () => true,
  setAlwaysOnTop: async (value) => Boolean(value),
  getWindowMode: async () => "detail",
  setWindowMode: async (mode) => mode,
  setCompactAlert: async (value) => Boolean(value),
  moveWindowBy: async () => null,
  getAutoRefreshMinutes: async () => 0,
  setAutoRefreshMinutes: async (minutes) => Number(minutes),
  getCompactAppearance: async () => normalizeCompactAppearance(),
  setCompactAppearance: async (value) => normalizeCompactAppearance(value),
  recordHistory: async () => null,
  getHistory: async (range) => getHistory(range),
  openCodex: async () => {},
  onRefresh: () => {},
  onAlwaysOnTopChanged: () => {},
  onWindowModeChanged: () => {}
});
