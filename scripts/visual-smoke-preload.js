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
  const step = 5 * 60000;
  for (let time = Math.ceil(range.start / step) * step; time < Math.min(now, range.end); time += step) {
    const index = Math.floor(time / step);
    points.push({
      timestamp: time,
      primaryRemaining: 96 - ((index * 8) % 82),
      secondaryRemaining: 82 - (index % 40) * 1.8
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
  setDetailView: async () => false,
  setHistoryPinned: async (value) => Boolean(value),
  onHistoryPinnedChanged: () => {},
  getWindowMode: async () => "detail",
  setWindowMode: async (mode) => mode,
  setCompactAlert: async (value) => Boolean(value),
  moveWindowBy: async () => null,
  getAutoRefreshMinutes: async () => 0,
  setAutoRefreshMinutes: async (minutes) => Number(minutes),
  getCompactAppearance: async () => normalizeCompactAppearance(),
  setCompactAppearance: async (value) => normalizeCompactAppearance(value),
  getTheme: async () => ({ source: "system", resolvedTheme: "light", platform: "win32", glassEnabled: false }),
  setTheme: async (source) => ({ source, resolvedTheme: source === "dark" ? "dark" : "light", platform: "win32", glassEnabled: false }),
  recordHistory: async () => null,
  getHistory: async (range) => getHistory(range),
  exportHistory: async () => ({ canceled: false, recordCount: 42, filePath: "C:\\Temp\\quota.csv" }),
  getAppVersion: async () => "1.2.1",
  setTrayState: async () => {},
  onReportUpdated: () => {},
  refreshReports: async () => {},
  getReport: async (query) => {
    const date = new Date(`${query.anchor}T00:00:00Z`);
    if (query.period === "week") date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    if (query.period === "month") date.setUTCDate(1);
    const endDate = new Date(date);
    if (query.period === "month") endDate.setUTCMonth(endDate.getUTCMonth() + 1);
    else endDate.setUTCDate(endDate.getUTCDate() + (query.period === "week" ? 7 : 1));
    const start = date.getTime() - 8 * 3600000;
    const end = endDate.getTime() - 8 * 3600000;
    const count = Math.round((end - start) / 86400000);
    const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
    const usage = { input_tokens: 14287650, cached_input_tokens: 12854720, output_tokens: 89620, reasoning_output_tokens: 42380, total_tokens: 14377270 };
    const days = Array.from({ length: count }, (_, index) => {
      const day = new Date(start + index * 86400000 + 8 * 3600000).toISOString().slice(0, 10);
      return { date: day, status: day < today ? "recorded" : "pending", usage: day < today ? usage : null };
    });
    const recordedDays = days.filter((day) => day.status === "recorded").length;
    return { start, end, startDate: days[0].date, endDate: days.at(-1).date,
      sourceStatus: "ready", scanning: false, days, recordedDays, missingDays: 0, pendingDays: count - recordedDays,
      totals: recordedDays ? Object.fromEntries(Object.entries(usage).map(([key, value]) => [key, value * recordedDays])) : null,
      updatedAt: Date.now(), settledThrough: new Date(Date.now() - 86400000 + 8 * 3600000).toISOString().slice(0, 10) };
  },
  checkForUpdates: async () => ({
    currentVersion: "1.1.2",
    latestVersion: "1.2.0",
    releaseUrl: "https://github.com/lambsusie/codex-floating-ball/releases/tag/v1.2.0",
    updateAvailable: true
  }),
  notifyUpdate: async () => true,
  openUpdatePage: async () => true,
  openCodex: async () => {},
  onRefresh: () => {},
  onAlwaysOnTopChanged: () => {},
  onWindowModeChanged: () => {},
  onThemeChanged: () => {}
});
