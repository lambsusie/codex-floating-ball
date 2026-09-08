const COMPACT_RENDER_SCALE = 4;

const labels = {
  zh: {
    brand: "Codex 额度",
    loading: "读取中",
    ready: "已更新",
    error: "读取失败",
    remaining: "剩余",
    primary: "5小时窗口",
    secondary: "7天窗口",
    plan: "计划",
    refresh: "刷新",
    hide: "收起",
    close: "退出",
    settings: "设置",
    settingsTitle: "设置",
    settingsSubtitle: "界面、报警与刷新",
    back: "返回",
    language: "语言",
    theme: "主题",
    themeLight: "浅色",
    themeDark: "深色",
    autoUpdate: "自动检查更新",
    versionUpdate: "版本更新",
    currentVersion: "当前版本 v{version}",
    checkingUpdate: "正在检查更新...",
    updateCurrent: "已是最新版本 · v{version}",
    updateAvailable: "发现新版本 v{version}",
    updateFailed: "检查失败，请稍后重试",
    checkUpdate: "检查更新",
    viewUpdate: "查看新版",
    weeklyAlert: "周额度报警",
    primaryTimeDisplay: "5小时额度时间",
    secondaryTimeDisplay: "7天额度时间",
    compactTimeDisplay: "悬浮球时间",
    timeDisplayDuration: "剩余时长",
    timeDisplayPoint: "重置时间点",
    untilReset: "距重置",
    resetsAt: "重置于",
    settingsHint: "周额度低于所选百分比时，小球旁边会显示红色告警。",
    pinOn: "取消置顶",
    pinOff: "置顶",
    showDetail: "显示完整面板",
    reading: "正在读取 Codex 额度...",
    updated: "额度已更新",
    unavailable: "暂无数据",
    reset: "重置",
    used: "已用",
    left: "剩余",
    autoRefresh: "自动刷新",
    autoManual: "手动",
    minute: "分钟",
    weeklyQuota: "周额度",
    regularRefresh: "常规刷新",
    smartEnabled: "智能启用",
    smartActiveRefresh: "活跃刷新间隔",
    smartIdleTimeout: "额度无变化持续",
    smartIdleRefresh: "无变化后刷新",
    smartStatus: "当前状态",
    smartActive: "自动刷新",
    smartIdle: "低频刷新",
    smartPaused: "手动刷新",
    smartManaged: "智能模式正在管理刷新间隔。",
    smartHint: "额度连续 {idle} 无变化后切换为 {idleRefresh}；检测到额度变化或手动刷新后恢复 {interval}。",
    history: "额度历史",
    historyTitle: "额度消耗",
    historySubtitle: "每次刷新自动记录",
    historyEmpty: "这一时段还没有记录",
    historyLoadError: "读取历史失败",
    historyExport: "导出记录",
    historyExporting: "正在导出...",
    historyExported: "已导出 {count} 条记录",
    historyExportFailed: "导出失败",
    historyMetric: "纵轴显示",
    historyMetricUsed: "消耗额度",
    historyMetricRemaining: "剩余额度",
    periodDay: "日",
    periodWeek: "周",
    periodMonth: "月",
    periodCycle: "5h",
    primaryUsed: "5小时已用",
    secondaryUsed: "7天已用",
    primaryRemaining: "5小时剩余",
    secondaryRemaining: "7天剩余",
    historyPoints: "{count} 个记录点",
    previousPeriod: "上一时段",
    nextPeriod: "下一时段",
    compactSize: "悬浮球大小",
    quotaFontSize: "额度字号",
    resetFontSize: "重置时间字号"
  },
  en: {
    brand: "Codex Quota",
    loading: "Loading",
    ready: "Updated",
    error: "Failed",
    remaining: "left",
    primary: "5-hour window",
    secondary: "7-day window",
    plan: "Plan",
    refresh: "Refresh",
    hide: "Collapse",
    close: "Exit",
    settings: "Settings",
    settingsTitle: "Settings",
    settingsSubtitle: "Display, alerts, and refresh",
    back: "Back",
    language: "Language",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    autoUpdate: "Automatically check for updates",
    versionUpdate: "App updates",
    currentVersion: "Current version v{version}",
    checkingUpdate: "Checking for updates...",
    updateCurrent: "Up to date · v{version}",
    updateAvailable: "Version v{version} is available",
    updateFailed: "Could not check for updates",
    checkUpdate: "Check now",
    viewUpdate: "View update",
    weeklyAlert: "Weekly alert",
    primaryTimeDisplay: "5-hour quota time",
    secondaryTimeDisplay: "7-day quota time",
    compactTimeDisplay: "Floating ball time",
    timeDisplayDuration: "Time remaining",
    timeDisplayPoint: "Reset time",
    untilReset: "resets in",
    resetsAt: "resets at",
    settingsHint: "When weekly quota falls below the selected percent, a red alert orb appears beside the main orb.",
    pinOn: "Unpin",
    pinOff: "Pin",
    showDetail: "Show details",
    reading: "Reading Codex quota...",
    updated: "Quota updated",
    unavailable: "No data",
    reset: "reset",
    used: "used",
    left: "left",
    autoRefresh: "Auto",
    autoManual: "Manual",
    minute: "min",
    weeklyQuota: "7d quota",
    regularRefresh: "Regular refresh",
    smartEnabled: "Smart refresh",
    smartActiveRefresh: "Active refresh interval",
    smartIdleTimeout: "Quota unchanged for",
    smartIdleRefresh: "Refresh after idle",
    smartStatus: "Current state",
    smartActive: "Auto refreshing",
    smartIdle: "Low-frequency refresh",
    smartPaused: "Manual refresh",
    smartManaged: "Smart refresh is managing this interval.",
    smartHint: "After {idle} without quota changes, switches to {idleRefresh}. A detected change or manual refresh restores {interval}.",
    history: "Quota history",
    historyTitle: "Quota usage",
    historySubtitle: "Recorded on every refresh",
    historyEmpty: "No records in this period",
    historyLoadError: "Could not load history",
    historyExport: "Export history",
    historyExporting: "Exporting...",
    historyExported: "Exported {count} records",
    historyExportFailed: "Export failed",
    historyMetric: "Vertical axis",
    historyMetricUsed: "Quota used",
    historyMetricRemaining: "Quota remaining",
    periodDay: "Day",
    periodWeek: "Week",
    periodMonth: "Month",
    periodCycle: "5h",
    primaryUsed: "5-hour used",
    secondaryUsed: "7-day used",
    primaryRemaining: "5-hour remaining",
    secondaryRemaining: "7-day remaining",
    historyPoints: "{count} points",
    previousPeriod: "Previous period",
    nextPeriod: "Next period",
    compactSize: "Floating ball size",
    quotaFontSize: "Quota font size",
    resetFontSize: "Reset font size"
  }
};

const DEFAULT_WEEKLY_ALERT_THRESHOLD = 5;
const COMPACT_DOUBLE_CLICK_MS = 260;
const AUTO_REFRESH_MINUTES = new Set([0, 1, 5, 10, 30, 60]);
const SMART_ACTIVE_REFRESH_MINUTES = new Set([1, 5, 10, 30, 60]);
const SMART_IDLE_MINUTES = new Set([5, 10, 15, 30, 45, 60, 90, 120]);
const SMART_IDLE_REFRESH_MINUTES = new Set([0, 30, 60]);
const DEFAULT_SMART_ACTIVE_REFRESH_MINUTES = 1;
const DEFAULT_SMART_IDLE_MINUTES = 30;
const DEFAULT_SMART_IDLE_REFRESH_MINUTES = 0;
const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const HISTORY_METRICS = new Set(["used", "remaining"]);
const TIME_DISPLAY_MODES = new Set(["duration", "point"]);
const { getQuotaUsageFingerprint, getDisplayedRefreshMinutes } = window.smartRefreshUtils;
const { buildQuotaSeries, getAxisTickValues, getPeriodRange, shiftPeriod } = window.historyUtils;

const state = {
  lang: getStoredLanguage(),
  theme: getStoredTheme(),
  autoCheckUpdates: getStoredAutoCheckUpdates(),
  currentVersion: "",
  updateStatus: "idle",
  updateChecking: false,
  availableUpdate: null,
  updateCheckTimer: undefined,
  loading: false,
  alwaysOnTop: true,
  mode: "compact",
  view: "main",
  weeklyAlertThreshold: getStoredWeeklyThreshold(),
  primaryTimeDisplay: getStoredTimeDisplay("codex-led-primary-time-display"),
  secondaryTimeDisplay: getStoredTimeDisplay("codex-led-secondary-time-display"),
  compactTimeDisplay: getStoredTimeDisplay("codex-led-compact-time-display"),
  weeklyAlertActive: false,
  autoRefreshMinutes: 5,
  autoRefreshTimer: undefined,
  regularRefreshMinutes: getStoredRefreshMinutes("codex-led-regular-refresh-minutes", 5, AUTO_REFRESH_MINUTES),
  smartEnabled: getStoredSmartEnabled(),
  smartActiveRefreshMinutes: getStoredRefreshMinutes("codex-led-smart-active-refresh-minutes", DEFAULT_SMART_ACTIVE_REFRESH_MINUTES, SMART_ACTIVE_REFRESH_MINUTES),
  smartIdleMinutes: getStoredRefreshMinutes("codex-led-smart-idle-minutes", DEFAULT_SMART_IDLE_MINUTES, SMART_IDLE_MINUTES),
  smartIdleRefreshMinutes: getStoredRefreshMinutes("codex-led-smart-idle-refresh-minutes", DEFAULT_SMART_IDLE_REFRESH_MINUTES, SMART_IDLE_REFRESH_MINUTES),
  smartMode: getStoredSmartMode(),
  smartLastFingerprint: localStorage.getItem("codex-led-smart-last-fingerprint"),
  smartLastChangeAt: getStoredSmartLastChangeAt(),
  smartIdleTimer: undefined,
  compactAppearance: { ballSize: 120, quotaFontSize: 27, resetFontSize: 11 },
  historyPeriod: "day",
  historyMetric: getStoredHistoryMetric(),
  historyAnchor: new Date(),
  historyRecords: [],
  historyLoading: false,
  historyChartPoints: [],
  lastQuota: null
};

const el = {
  body: document.body,
  compactBall: document.getElementById("compactBall"),
  compactLiquidFill: document.getElementById("compactLiquidFill"),
  compactRemaining: document.getElementById("compactRemaining"),
  compactReset: document.getElementById("compactReset"),
  weeklyWarning: document.getElementById("weeklyWarning"),
  weeklyRemaining: document.getElementById("weeklyRemaining"),
  weeklyLabel: document.getElementById("weeklyLabel"),
  trafficLight: document.getElementById("trafficLight"),
  brandName: document.getElementById("brandName"),
  stateText: document.getElementById("stateText"),
  historyBtn: document.getElementById("historyBtn"),
  settingsBtn: document.getElementById("settingsBtn"),
  pinBtn: document.getElementById("pinBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  minimizeBtn: document.getElementById("minimizeBtn"),
  closeBtn: document.getElementById("closeBtn"),
  liquidFill: document.getElementById("liquidFill"),
  remaining: document.getElementById("remaining"),
  remainingLabel: document.getElementById("remainingLabel"),
  primaryLabel: document.getElementById("primaryLabel"),
  primaryText: document.getElementById("primaryText"),
  secondaryLabel: document.getElementById("secondaryLabel"),
  secondaryText: document.getElementById("secondaryText"),
  planLabel: document.getElementById("planLabel"),
  planText: document.getElementById("planText"),
  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
  autoRefreshLabel: document.getElementById("autoRefreshLabel"),
  autoRefreshSelect: document.getElementById("autoRefreshSelect"),
  settingsPanel: document.getElementById("settingsPanel"),
  settingsBackBtn: document.getElementById("settingsBackBtn"),
  settingsTitle: document.getElementById("settingsTitle"),
  settingsSubtitle: document.getElementById("settingsSubtitle"),
  languageSettingLabel: document.getElementById("languageSettingLabel"),
  languageSelect: document.getElementById("languageSelect"),
  themeSettingLabel: document.getElementById("themeSettingLabel"),
  themeSelect: document.getElementById("themeSelect"),
  autoUpdateSettingLabel: document.getElementById("autoUpdateSettingLabel"),
  autoUpdateToggle: document.getElementById("autoUpdateToggle"),
  versionSettingLabel: document.getElementById("versionSettingLabel"),
  updateStatusText: document.getElementById("updateStatusText"),
  checkUpdateBtn: document.getElementById("checkUpdateBtn"),
  weeklyThresholdLabel: document.getElementById("weeklyThresholdLabel"),
  weeklyThresholdSelect: document.getElementById("weeklyThresholdSelect"),
  primaryTimeDisplayLabel: document.getElementById("primaryTimeDisplayLabel"),
  primaryTimeDisplaySelect: document.getElementById("primaryTimeDisplaySelect"),
  secondaryTimeDisplayLabel: document.getElementById("secondaryTimeDisplayLabel"),
  secondaryTimeDisplaySelect: document.getElementById("secondaryTimeDisplaySelect"),
  compactTimeDisplayLabel: document.getElementById("compactTimeDisplayLabel"),
  compactTimeDisplaySelect: document.getElementById("compactTimeDisplaySelect"),
  compactSizeLabel: document.getElementById("compactSizeLabel"),
  compactSizeRange: document.getElementById("compactSizeRange"),
  compactSizeValue: document.getElementById("compactSizeValue"),
  quotaFontSizeLabel: document.getElementById("quotaFontSizeLabel"),
  quotaFontSizeRange: document.getElementById("quotaFontSizeRange"),
  quotaFontSizeValue: document.getElementById("quotaFontSizeValue"),
  resetFontSizeLabel: document.getElementById("resetFontSizeLabel"),
  resetFontSizeRange: document.getElementById("resetFontSizeRange"),
  resetFontSizeValue: document.getElementById("resetFontSizeValue"),
  regularRefreshRow: document.getElementById("regularRefreshRow"),
  regularRefreshLabel: document.getElementById("regularRefreshLabel"),
  regularRefreshSelect: document.getElementById("regularRefreshSelect"),
  smartEnabledLabel: document.getElementById("smartEnabledLabel"),
  smartEnabledToggle: document.getElementById("smartEnabledToggle"),
  smartSettingsControls: document.getElementById("smartSettingsControls"),
  smartActiveRefreshLabel: document.getElementById("smartActiveRefreshLabel"),
  smartActiveRefreshSelect: document.getElementById("smartActiveRefreshSelect"),
  smartIdleTimeoutLabel: document.getElementById("smartIdleTimeoutLabel"),
  smartIdleTimeoutSelect: document.getElementById("smartIdleTimeoutSelect"),
  smartIdleRefreshLabel: document.getElementById("smartIdleRefreshLabel"),
  smartIdleRefreshSelect: document.getElementById("smartIdleRefreshSelect"),
  smartStatusLabel: document.getElementById("smartStatusLabel"),
  smartStatusText: document.getElementById("smartStatusText"),
  settingsHint: document.getElementById("settingsHint"),
  smartSettingsHint: document.getElementById("smartSettingsHint"),
  historyPanel: document.getElementById("historyPanel"),
  historyBackBtn: document.getElementById("historyBackBtn"),
  historyTitle: document.getElementById("historyTitle"),
  historySubtitle: document.getElementById("historySubtitle"),
  historyExportBtn: document.getElementById("historyExportBtn"),
  historyPeriodButtons: [...document.querySelectorAll("[data-period]")],
  historyPrevBtn: document.getElementById("historyPrevBtn"),
  historyNextBtn: document.getElementById("historyNextBtn"),
  historyRangeLabel: document.getElementById("historyRangeLabel"),
  historyMetricSelect: document.getElementById("historyMetricSelect"),
  historyChart: document.getElementById("historyChart"),
  historyEmpty: document.getElementById("historyEmpty"),
  historyTooltip: document.getElementById("historyTooltip"),
  historyTooltipTime: document.getElementById("historyTooltipTime"),
  historyTooltipPrimary: document.getElementById("historyTooltipPrimary"),
  historyTooltipSecondary: document.getElementById("historyTooltipSecondary"),
  historyPrimaryLegend: document.getElementById("historyPrimaryLegend"),
  historySecondaryLegend: document.getElementById("historySecondaryLegend"),
  historyPointCount: document.getElementById("historyPointCount")
};

let compactClickTimer;
let compactDragState;
let suppressCompactClick = false;
let compactAppearanceTimer;
let compactAppearanceRequest = 0;
let historyLoadRequest = 0;
let historyExportStatusTimer;

function t(key) {
  return labels[state.lang][key];
}

function getStoredLanguage() {
  const value = localStorage.getItem("codex-led-lang");
  return value === "en" ? "en" : "zh";
}

function getStoredTheme() {
  const value = localStorage.getItem("codex-led-theme");
  return value === "dark" ? "dark" : "light";
}

function getStoredAutoCheckUpdates() {
  return localStorage.getItem("codex-led-auto-check-updates") !== "false";
}

function getStoredHistoryMetric() {
  const value = localStorage.getItem("codex-led-history-metric");
  return HISTORY_METRICS.has(value) ? value : "used";
}

function getStoredWeeklyThreshold() {
  return normalizeWeeklyThreshold(localStorage.getItem("codex-led-weekly-threshold"));
}

function getStoredTimeDisplay(key) {
  const value = localStorage.getItem(key);
  return TIME_DISPLAY_MODES.has(value) ? value : "duration";
}

function getStoredRefreshMinutes(key, fallback, allowedValues) {
  const value = Number(localStorage.getItem(key));
  return allowedValues.has(value) ? value : fallback;
}

function getStoredSmartEnabled() {
  return localStorage.getItem("codex-led-smart-enabled") === "true";
}

function getStoredSmartMode() {
  const value = localStorage.getItem("codex-led-smart-mode");
  return value === "manual" || value === "idle" ? value : "active";
}

function getStoredSmartLastChangeAt() {
  const value = Number(localStorage.getItem("codex-led-smart-last-change-at"));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function normalizeWeeklyThreshold(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_WEEKLY_ALERT_THRESHOLD;
  return Math.max(1, Math.min(99, Math.round(number)));
}

function applyLabels() {
  el.brandName.textContent = t("brand");
  el.remainingLabel.textContent = t("remaining");
  el.primaryLabel.textContent = t("primary");
  el.secondaryLabel.textContent = t("secondary");
  el.planLabel.textContent = t("plan");
  el.autoRefreshLabel.textContent = t("autoRefresh");
  el.autoRefreshSelect.setAttribute("aria-label", t("autoRefresh"));
  updateAutoRefreshOptions();
  updateSettingsControls();
  el.historyBtn.title = t("history");
  el.historyBtn.setAttribute("aria-label", t("history"));
  el.settingsBtn.title = t("settings");
  el.settingsBtn.setAttribute("aria-label", t("settings"));
  el.settingsBackBtn.title = t("back");
  el.settingsBackBtn.setAttribute("aria-label", t("back"));
  el.settingsTitle.textContent = t("settingsTitle");
  el.settingsSubtitle.textContent = t("settingsSubtitle");
  el.languageSettingLabel.textContent = t("language");
  el.languageSelect.setAttribute("aria-label", t("language"));
  el.themeSettingLabel.textContent = t("theme");
  el.themeSelect.setAttribute("aria-label", t("theme"));
  el.autoUpdateSettingLabel.textContent = t("autoUpdate");
  el.autoUpdateToggle.setAttribute("aria-label", t("autoUpdate"));
  el.versionSettingLabel.textContent = t("versionUpdate");
  el.weeklyThresholdLabel.textContent = t("weeklyAlert");
  el.weeklyThresholdSelect.setAttribute("aria-label", t("weeklyAlert"));
  el.primaryTimeDisplayLabel.textContent = t("primaryTimeDisplay");
  el.primaryTimeDisplaySelect.setAttribute("aria-label", t("primaryTimeDisplay"));
  el.secondaryTimeDisplayLabel.textContent = t("secondaryTimeDisplay");
  el.secondaryTimeDisplaySelect.setAttribute("aria-label", t("secondaryTimeDisplay"));
  el.compactTimeDisplayLabel.textContent = t("compactTimeDisplay");
  el.compactTimeDisplaySelect.setAttribute("aria-label", t("compactTimeDisplay"));
  el.regularRefreshLabel.textContent = t("regularRefresh");
  el.regularRefreshSelect.setAttribute("aria-label", t("regularRefresh"));
  el.smartEnabledLabel.textContent = t("smartEnabled");
  el.smartEnabledToggle.setAttribute("aria-label", t("smartEnabled"));
  el.smartActiveRefreshLabel.textContent = t("smartActiveRefresh");
  el.smartActiveRefreshSelect.setAttribute("aria-label", t("smartActiveRefresh"));
  el.smartIdleTimeoutLabel.textContent = t("smartIdleTimeout");
  el.smartIdleTimeoutSelect.setAttribute("aria-label", t("smartIdleTimeout"));
  el.smartIdleRefreshLabel.textContent = t("smartIdleRefresh");
  el.smartIdleRefreshSelect.setAttribute("aria-label", t("smartIdleRefresh"));
  el.smartStatusLabel.textContent = t("smartStatus");
  el.compactSizeLabel.textContent = t("compactSize");
  el.quotaFontSizeLabel.textContent = t("quotaFontSize");
  el.resetFontSizeLabel.textContent = t("resetFontSize");
  el.settingsHint.textContent = t("settingsHint");
  el.compactBall.title = t("showDetail");
  el.compactBall.setAttribute("aria-label", t("showDetail"));
  el.weeklyLabel.textContent = t("weeklyQuota");
  el.refreshBtn.title = t("refresh");
  el.refreshBtn.setAttribute("aria-label", t("refresh"));
  el.minimizeBtn.title = t("hide");
  el.minimizeBtn.setAttribute("aria-label", t("hide"));
  el.closeBtn.title = t("close");
  el.closeBtn.setAttribute("aria-label", t("close"));
  el.historyBackBtn.title = t("back");
  el.historyBackBtn.setAttribute("aria-label", t("back"));
  el.historyTitle.textContent = t("historyTitle");
  el.historySubtitle.textContent = t("historySubtitle");
  el.historyExportBtn.title = t("historyExport");
  el.historyExportBtn.setAttribute("aria-label", t("historyExport"));
  el.historyEmpty.textContent = t("historyEmpty");
  el.historyMetricSelect.setAttribute("aria-label", t("historyMetric"));
  el.historyPrevBtn.setAttribute("aria-label", t("previousPeriod"));
  el.historyNextBtn.setAttribute("aria-label", t("nextPeriod"));
  const periodLabels = {
    cycle: "periodCycle",
    day: "periodDay",
    week: "periodWeek",
    month: "periodMonth"
  };
  el.historyPeriodButtons.forEach((button) => {
    button.textContent = t(periodLabels[button.dataset.period]);
  });
  updateHistoryMetricControls();
  updateHistoryPeriodControls();
  updatePinButton(state.alwaysOnTop);
}

function updateSettingsControls() {
  el.languageSelect.value = state.lang;
  el.themeSelect.value = state.theme;
  el.themeSelect.options[0].textContent = t("themeLight");
  el.themeSelect.options[1].textContent = t("themeDark");
  el.weeklyThresholdSelect.value = String(state.weeklyAlertThreshold);
  for (const select of [el.primaryTimeDisplaySelect, el.secondaryTimeDisplaySelect, el.compactTimeDisplaySelect]) {
    select.options[0].textContent = t("timeDisplayDuration");
    select.options[1].textContent = t("timeDisplayPoint");
  }
  el.primaryTimeDisplaySelect.value = state.primaryTimeDisplay;
  el.secondaryTimeDisplaySelect.value = state.secondaryTimeDisplay;
  el.compactTimeDisplaySelect.value = state.compactTimeDisplay;
  el.regularRefreshSelect.value = String(state.regularRefreshMinutes);
  el.regularRefreshSelect.disabled = state.smartEnabled;
  el.regularRefreshRow.classList.toggle("is-managed", state.smartEnabled);
  el.smartEnabledToggle.checked = state.smartEnabled;
  el.smartSettingsControls.hidden = !state.smartEnabled;
  el.smartActiveRefreshSelect.value = String(state.smartActiveRefreshMinutes);
  el.smartIdleTimeoutSelect.value = String(state.smartIdleMinutes);
  el.smartIdleRefreshSelect.value = String(state.smartIdleRefreshMinutes);
  el.smartStatusText.textContent = formatSmartStatus();
  el.smartSettingsHint.hidden = !state.smartEnabled;
  el.smartSettingsHint.textContent = formatSmartHint();
  updateUpdateControls();
  applyCompactAppearance(state.compactAppearance);
}

function updateUpdateControls() {
  el.autoUpdateToggle.checked = state.autoCheckUpdates;
  el.updateStatusText.textContent = formatUpdateStatus();
  el.checkUpdateBtn.disabled = state.updateChecking;
  el.checkUpdateBtn.textContent = state.availableUpdate ? t("viewUpdate") : t("checkUpdate");
  el.settingsBtn.classList.toggle("has-update", Boolean(state.availableUpdate));
}

function formatUpdateStatus() {
  if (state.updateStatus === "checking") return t("checkingUpdate");
  if (state.updateStatus === "available" && state.availableUpdate) {
    return t("updateAvailable").replace("{version}", state.availableUpdate.latestVersion);
  }
  if (state.updateStatus === "current") {
    return t("updateCurrent").replace("{version}", state.currentVersion || "--");
  }
  if (state.updateStatus === "error") return t("updateFailed");
  return t("currentVersion").replace("{version}", state.currentVersion || "--");
}

function updateAutoRefreshOptions() {
  for (const select of [el.autoRefreshSelect, el.regularRefreshSelect, el.smartActiveRefreshSelect, el.smartIdleRefreshSelect]) {
    for (const option of select.options) {
      const minutes = Number(option.value);
      option.textContent = formatRefreshMinutes(minutes);
    }
  }
  const displayedMinutes = getDisplayedRefreshMinutes(state);
  el.autoRefreshSelect.value = String(displayedMinutes);
  el.autoRefreshSelect.disabled = false;
  el.autoRefreshSelect.title = state.smartEnabled ? t("smartActiveRefresh") : t("autoRefresh");
}

function formatRefreshMinutes(minutes) {
  return minutes === 0 ? t("autoManual") : `${minutes}${t("minute")}`;
}

function formatSmartStatus() {
  if (state.smartMode === "manual") return t("smartPaused");
  if (state.smartMode === "idle") return `${t("smartIdle")} · ${formatRefreshMinutes(state.smartIdleRefreshMinutes)}`;
  return `${t("smartActive")} · ${formatRefreshMinutes(state.smartActiveRefreshMinutes)}`;
}

function formatSmartHint() {
  return t("smartHint")
    .replace("{idle}", formatRefreshMinutes(state.smartIdleMinutes))
    .replace("{idleRefresh}", formatRefreshMinutes(state.smartIdleRefreshMinutes))
    .replace("{interval}", formatRefreshMinutes(state.smartActiveRefreshMinutes));
}

function updatePinButton(value) {
  state.alwaysOnTop = Boolean(value);
  el.pinBtn.classList.toggle("active", state.alwaysOnTop);
  el.pinBtn.title = state.alwaysOnTop ? t("pinOn") : t("pinOff");
  el.pinBtn.setAttribute("aria-label", el.pinBtn.title);
}

function updateWindowMode(mode) {
  state.mode = mode === "detail" ? "detail" : "compact";
  el.body.dataset.mode = state.mode;
  if (state.mode === "compact") updateDetailView("main");
}

async function setWindowMode(mode) {
  updateWindowMode(await window.codexQuota.setWindowMode(mode));
}

function updateDetailView(view) {
  state.view = view === "settings" || view === "history" ? view : "main";
  el.body.dataset.view = state.view;
  el.settingsPanel.hidden = state.view !== "settings";
  el.historyPanel.hidden = state.view !== "history";
  el.settingsBtn.classList.toggle("active", state.view === "settings");
  el.historyBtn.classList.toggle("active", state.view === "history");
  if (state.view === "history") void loadHistory();
  else hideHistoryTooltip();
}

function applyTheme() {
  el.body.dataset.theme = state.theme;
  if (state.view === "history") drawHistoryChart();
}

function applyCompactAppearance(value) {
  const appearance = {
    ballSize: Number(value?.ballSize) || 120,
    quotaFontSize: Number(value?.quotaFontSize) || 27,
    resetFontSize: Number(value?.resetFontSize) || 11
  };
  state.compactAppearance = appearance;

  const root = document.documentElement.style;
  root.setProperty("--compact-size", `${appearance.ballSize}px`);
  root.setProperty("--compact-render-size", `${appearance.ballSize * COMPACT_RENDER_SCALE}px`);
  root.setProperty("--compact-render-scale", String(1 / COMPACT_RENDER_SCALE));
  root.setProperty("--compact-quota-font-render", `${appearance.quotaFontSize * COMPACT_RENDER_SCALE}px`);
  root.setProperty("--compact-reset-font-render", `${appearance.resetFontSize * COMPACT_RENDER_SCALE}px`);
  root.setProperty("--compact-text-width", `${Math.max(80, appearance.ballSize - 24) * COMPACT_RENDER_SCALE}px`);

  el.compactSizeRange.value = String(appearance.ballSize);
  el.quotaFontSizeRange.max = String(Math.floor(appearance.ballSize * 0.35));
  el.resetFontSizeRange.max = String(Math.floor(appearance.ballSize * 0.14));
  el.quotaFontSizeRange.value = String(appearance.quotaFontSize);
  el.resetFontSizeRange.value = String(appearance.resetFontSize);
  el.compactSizeValue.textContent = `${appearance.ballSize} px`;
  el.quotaFontSizeValue.textContent = `${appearance.quotaFontSize} px`;
  el.resetFontSizeValue.textContent = `${appearance.resetFontSize} px`;
}

function scheduleCompactAppearanceUpdate() {
  if (compactAppearanceTimer) clearTimeout(compactAppearanceTimer);
  compactAppearanceTimer = setTimeout(async () => {
    const request = ++compactAppearanceRequest;
    const value = {
      ballSize: Number(el.compactSizeRange.value),
      quotaFontSize: Number(el.quotaFontSizeRange.value),
      resetFontSize: Number(el.resetFontSizeRange.value)
    };
    try {
      const normalized = await window.codexQuota.setCompactAppearance(value);
      if (request === compactAppearanceRequest) applyCompactAppearance(normalized);
    } catch {
      if (request === compactAppearanceRequest) applyCompactAppearance(state.compactAppearance);
    }
  }, 80);
}

function updateHistoryMetricControls() {
  const remaining = state.historyMetric === "remaining";
  el.historyMetricSelect.value = state.historyMetric;
  el.historyMetricSelect.options[0].textContent = t("historyMetricUsed");
  el.historyMetricSelect.options[1].textContent = t("historyMetricRemaining");
  el.historyPrimaryLegend.textContent = t(remaining ? "primaryRemaining" : "primaryUsed");
  el.historySecondaryLegend.textContent = t(remaining ? "secondaryRemaining" : "secondaryUsed");
  el.historyChart.setAttribute("aria-label", `${t("historyTitle")} · ${t(remaining ? "historyMetricRemaining" : "historyMetricUsed")}`);
}

function setHistoryMetric(value) {
  state.historyMetric = HISTORY_METRICS.has(value) ? value : "used";
  localStorage.setItem("codex-led-history-metric", state.historyMetric);
  updateHistoryMetricControls();
  drawHistoryChart();
}

function setHistoryPeriod(period) {
  state.historyPeriod = period;
  if (period === "cycle") {
    const resetAt = state.lastQuota?.primary?.resetsAt;
    state.historyAnchor = resetAt ? new Date(resetAt) : new Date();
  } else {
    state.historyAnchor = new Date();
  }
  updateHistoryPeriodControls();
  void loadHistory();
}

function shiftHistoryPeriod(direction) {
  state.historyAnchor = shiftPeriod(state.historyPeriod, state.historyAnchor, direction);
  updateHistoryPeriodControls();
  void loadHistory();
}

async function exportHistoryRecords() {
  if (el.historyExportBtn.disabled) return;
  el.historyExportBtn.disabled = true;
  showHistoryFooterMessage(t("historyExporting"));
  try {
    const result = await window.codexQuota.exportHistory(state.lang);
    if (result?.canceled) {
      updateHistoryPeriodControls();
      return;
    }
    showHistoryFooterMessage(t("historyExported").replace("{count}", String(result?.recordCount ?? 0)), 4000);
  } catch {
    showHistoryFooterMessage(t("historyExportFailed"), 4000);
  } finally {
    el.historyExportBtn.disabled = false;
  }
}

function showHistoryFooterMessage(message, resetAfter = 0) {
  if (historyExportStatusTimer) clearTimeout(historyExportStatusTimer);
  el.historyPointCount.textContent = message;
  if (resetAfter > 0) {
    historyExportStatusTimer = setTimeout(() => {
      historyExportStatusTimer = undefined;
      updateHistoryPeriodControls();
    }, resetAfter);
  }
}

function updateHistoryPeriodControls() {
  const range = getPeriodRange(state.historyPeriod, state.historyAnchor);
  el.historyPeriodButtons.forEach((button) => {
    const active = button.dataset.period === state.historyPeriod;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  el.historyRangeLabel.textContent = formatHistoryRange(range);
  el.historyNextBtn.disabled = range.end > Date.now();
  el.historyPointCount.textContent = t("historyPoints").replace("{count}", String(state.historyRecords.length));
}

async function loadHistory() {
  if (state.view !== "history") return;
  const request = ++historyLoadRequest;
  state.historyLoading = true;
  const range = getPeriodRange(state.historyPeriod, state.historyAnchor);
  el.historyEmpty.hidden = false;
  el.historyEmpty.textContent = state.lang === "zh" ? "正在读取记录..." : "Loading history...";

  try {
    const records = await window.codexQuota.getHistory(range);
    if (request !== historyLoadRequest || state.view !== "history") return;
    state.historyRecords = records;
    el.historyEmpty.textContent = t("historyEmpty");
  } catch {
    if (request !== historyLoadRequest || state.view !== "history") return;
    state.historyRecords = [];
    el.historyEmpty.textContent = t("historyLoadError");
  } finally {
    if (request !== historyLoadRequest || state.view !== "history") return;
    state.historyLoading = false;
    updateHistoryPeriodControls();
    drawHistoryChart();
  }
}

function formatHistoryRange(range) {
  const locale = state.lang === "zh" ? "zh-CN" : "en-US";
  const start = new Date(range.start);
  const end = new Date(range.end - 1);
  if (state.historyPeriod === "month") {
    return start.toLocaleDateString(locale, { year: "numeric", month: "long" });
  }
  if (state.historyPeriod === "day") {
    return start.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
  }
  if (state.historyPeriod === "cycle") {
    const date = start.toLocaleDateString(locale, { month: "short", day: "numeric" });
    return `${date} ${formatAxisTime(start)}–${formatAxisTime(end)}`;
  }
  const startText = start.toLocaleDateString(locale, { month: "short", day: "numeric" });
  const endText = end.toLocaleDateString(locale, { month: "short", day: "numeric" });
  return `${startText} – ${endText}`;
}

function drawHistoryChart() {
  if (state.view !== "history") return;
  hideHistoryTooltip();
  state.historyChartPoints = [];
  const canvas = el.historyChart;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const range = getPeriodRange(state.historyPeriod, state.historyAnchor);
  const series = buildQuotaSeries(state.historyRecords, state.historyMetric);
  const dark = state.theme === "dark";
  const plot = { left: 38, top: 10, right: rect.width - 10, bottom: rect.height - 23 };
  const plotWidth = Math.max(1, plot.right - plot.left);
  const plotHeight = Math.max(1, plot.bottom - plot.top);
  const gridColor = dark ? "rgba(148,163,184,.15)" : "rgba(71,85,105,.12)";

  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.lineWidth = 1;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const percent of [0, 20, 40, 60, 80, 100]) {
    const y = plot.bottom - (percent / 100) * plotHeight;
    ctx.strokeStyle = gridColor;
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.right, y);
    ctx.stroke();
    ctx.fillStyle = dark ? "#94a3b8" : "#7b8494";
    ctx.fillText(`${percent}%`, plot.left - 5, y);
  }

  ctx.textBaseline = "top";
  const axisTimes = getAxisTickValues(state.historyPeriod, range);
  axisTimes.forEach((time, index) => {
    const x = plot.left + (index / (axisTimes.length - 1)) * plotWidth;
    ctx.strokeStyle = gridColor;
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();
    ctx.textAlign = index === 0 ? "left" : index === axisTimes.length - 1 ? "right" : "center";
    ctx.fillStyle = dark ? "#94a3b8" : "#7b8494";
    ctx.fillText(formatAxisTime(new Date(time)), x, plot.bottom + 6);
  });

  drawSeries(ctx, series, "primaryValue", "#2563eb", range, plot);
  drawSeries(ctx, series, "secondaryValue", "#ef5c68", range, plot);
  const xFor = (timestamp) => plot.left + ((timestamp - range.start) / (range.end - range.start)) * plotWidth;
  const yFor = (value) => plot.bottom - (value / 100) * plotHeight;
  state.historyChartPoints = series.map((point) => ({
    ...point,
    x: xFor(point.timestamp),
    primaryY: point.primaryValue === null ? null : yFor(point.primaryValue),
    secondaryY: point.secondaryValue === null ? null : yFor(point.secondaryValue)
  }));
  el.historyEmpty.hidden = series.length > 0;
}

function drawSeries(ctx, points, key, color, range, plot) {
  const usable = points.filter((point) => point[key] !== null);
  if (!usable.length) return;
  const xFor = (timestamp) => plot.left + ((timestamp - range.start) / (range.end - range.start)) * (plot.right - plot.left);
  const yFor = (value) => plot.bottom - (value / 100) * (plot.bottom - plot.top);

  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.left, plot.top, plot.right - plot.left, plot.bottom - plot.top);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  usable.forEach((point, index) => {
    const x = xFor(point.timestamp);
    const y = yFor(point[key]);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  const dotStep = Math.max(1, Math.ceil(usable.length / 120));
  ctx.fillStyle = color;
  usable.forEach((point, index) => {
    if (index % dotStep !== 0 && index !== usable.length - 1) return;
    ctx.beginPath();
    ctx.arc(xFor(point.timestamp), yFor(point[key]), 2.2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function handleHistoryChartPointerMove(event) {
  if (!state.historyChartPoints.length) {
    hideHistoryTooltip();
    return;
  }
  const rect = el.historyChart.getBoundingClientRect();
  const pointerX = event.clientX - rect.left;
  const pointerY = event.clientY - rect.top;
  let nearest;
  let nearestDistance = Infinity;

  for (const point of state.historyChartPoints) {
    for (const y of [point.primaryY, point.secondaryY]) {
      if (y === null) continue;
      const distance = Math.hypot(pointerX - point.x, pointerY - y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = { point, y };
      }
    }
  }

  if (!nearest || nearestDistance > 11) {
    hideHistoryTooltip();
    return;
  }
  showHistoryTooltip(nearest.point, nearest.y);
}

function showHistoryTooltip(point, anchorY) {
  const locale = state.lang === "zh" ? "zh-CN" : "en-US";
  el.historyTooltipTime.textContent = new Date(point.timestamp).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  el.historyTooltipPrimary.textContent = `${el.historyPrimaryLegend.textContent}: ${formatChartPercent(point.primaryValue)}`;
  el.historyTooltipSecondary.textContent = `${el.historySecondaryLegend.textContent}: ${formatChartPercent(point.secondaryValue)}`;
  el.historyTooltip.hidden = false;

  const shell = el.historyChart.parentElement.getBoundingClientRect();
  const tooltip = el.historyTooltip.getBoundingClientRect();
  let left = point.x + 10;
  if (left + tooltip.width > shell.width - 6) left = point.x - tooltip.width - 10;
  left = Math.max(6, Math.min(left, shell.width - tooltip.width - 6));
  const top = Math.max(6, Math.min(anchorY - tooltip.height / 2, shell.height - tooltip.height - 6));
  el.historyTooltip.style.left = `${left}px`;
  el.historyTooltip.style.top = `${top}px`;
}

function hideHistoryTooltip() {
  el.historyTooltip.hidden = true;
}

function formatChartPercent(value) {
  if (value === null || !Number.isFinite(Number(value))) return "--";
  const number = Math.round(Number(value) * 10) / 10;
  return `${number}%`;
}

function formatAxisTime(date) {
  if (state.historyPeriod === "month" || state.historyPeriod === "week") {
    return date.toLocaleDateString(state.lang === "zh" ? "zh-CN" : "en-US", { month: "numeric", day: "numeric" });
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

async function setEffectiveAutoRefreshMinutes(value) {
  const minutes = Number(value);
  if (!AUTO_REFRESH_MINUTES.has(minutes)) return;

  if (state.autoRefreshMinutes !== minutes) {
    state.autoRefreshMinutes = await window.codexQuota.setAutoRefreshMinutes(minutes);
  }

  configureAutoRefresh();
  updateAutoRefreshOptions();
  updateSettingsControls();
}

function setSmartMode(mode) {
  state.smartMode = mode === "manual" || mode === "idle" ? mode : "active";
  localStorage.setItem("codex-led-smart-mode", state.smartMode);
}

function setSmartLastChangeAt(value = Date.now()) {
  state.smartLastChangeAt = value;
  localStorage.setItem("codex-led-smart-last-change-at", String(value));
}

function setSmartLastFingerprint(value) {
  state.smartLastFingerprint = value;
  localStorage.setItem("codex-led-smart-last-fingerprint", value);
}

function clearSmartIdleTimer() {
  if (!state.smartIdleTimer) return;
  clearTimeout(state.smartIdleTimer);
  state.smartIdleTimer = undefined;
}

function scheduleSmartIdleTimeout() {
  clearSmartIdleTimer();
  if (!state.smartEnabled || state.smartMode !== "active") return;

  if (!state.smartLastChangeAt) setSmartLastChangeAt();
  const idleMs = state.smartIdleMinutes * 60 * 1000;
  const remainingMs = Math.max(0, idleMs - (Date.now() - state.smartLastChangeAt));
  state.smartIdleTimer = setTimeout(() => {
    void enterSmartIdleModeIfDue();
  }, remainingMs);
}

async function enterSmartIdleModeIfDue() {
  if (!state.smartEnabled || state.smartMode !== "active") return;

  const idleMs = state.smartIdleMinutes * 60 * 1000;
  if (Date.now() - state.smartLastChangeAt < idleMs) {
    scheduleSmartIdleTimeout();
    return;
  }

  await enterSmartIdleMode();
}

async function enterSmartIdleMode() {
  clearSmartIdleTimer();
  const minutes = state.smartIdleRefreshMinutes;
  setSmartMode(minutes === 0 ? "manual" : "idle");
  await setEffectiveAutoRefreshMinutes(minutes);
}

async function pauseSmartRefresh() {
  setSmartMode("manual");
  clearSmartIdleTimer();
  await setEffectiveAutoRefreshMinutes(0);
}

async function activateSmartRefresh() {
  setSmartMode("active");
  setSmartLastChangeAt();
  await setEffectiveAutoRefreshMinutes(state.smartActiveRefreshMinutes);
  scheduleSmartIdleTimeout();
}

async function observeSmartQuota(quota) {
  if (!state.smartEnabled) return;

  const fingerprint = getQuotaUsageFingerprint(quota);
  const changed = !state.smartLastFingerprint || state.smartLastFingerprint !== fingerprint;
  if (changed) {
    setSmartLastFingerprint(fingerprint);
    setSmartLastChangeAt();
  }

  if (changed && state.smartMode === "idle") {
    await activateSmartRefresh();
    return;
  }

  if (state.smartMode === "active") scheduleSmartIdleTimeout();
}

async function setRegularRefreshMinutes(value) {
  const minutes = Number(value);
  if (!AUTO_REFRESH_MINUTES.has(minutes)) return;

  state.regularRefreshMinutes = minutes;
  localStorage.setItem("codex-led-regular-refresh-minutes", String(minutes));
  if (!state.smartEnabled) await setEffectiveAutoRefreshMinutes(minutes);
  updateSettingsControls();
}

async function setSmartEnabled(value) {
  state.smartEnabled = Boolean(value);
  localStorage.setItem("codex-led-smart-enabled", String(state.smartEnabled));

  if (state.smartEnabled) {
    await activateSmartRefresh();
    await refreshQuota();
    return;
  }

  clearSmartIdleTimer();
  await setEffectiveAutoRefreshMinutes(state.regularRefreshMinutes);
}

async function setSmartActiveRefreshMinutes(value) {
  const minutes = Number(value);
  if (!SMART_ACTIVE_REFRESH_MINUTES.has(minutes)) return;

  state.smartActiveRefreshMinutes = minutes;
  localStorage.setItem("codex-led-smart-active-refresh-minutes", String(minutes));
  if (state.smartEnabled) {
    await activateSmartRefresh();
  }
  updateAutoRefreshOptions();
  updateSettingsControls();
}

async function setMainAutoRefreshMinutes(value) {
  const minutes = Number(value);
  if (!AUTO_REFRESH_MINUTES.has(minutes)) return;

  if (!state.smartEnabled) {
    await setRegularRefreshMinutes(minutes);
    return;
  }

  if (minutes === 0) {
    await pauseSmartRefresh();
    return;
  }

  await setSmartActiveRefreshMinutes(minutes);
}

function setTimeDisplay(scope, value) {
  if (!TIME_DISPLAY_MODES.has(value)) return;

  const keys = {
    primary: ["primaryTimeDisplay", "codex-led-primary-time-display"],
    secondary: ["secondaryTimeDisplay", "codex-led-secondary-time-display"],
    compact: ["compactTimeDisplay", "codex-led-compact-time-display"]
  };
  const setting = keys[scope];
  if (!setting) return;

  state[setting[0]] = value;
  localStorage.setItem(setting[1], value);
  updateSettingsControls();
  if (state.lastQuota) renderQuota(state.lastQuota);
}

function setSmartIdleMinutes(value) {
  const minutes = Number(value);
  if (!SMART_IDLE_MINUTES.has(minutes)) return;

  state.smartIdleMinutes = minutes;
  localStorage.setItem("codex-led-smart-idle-minutes", String(minutes));
  if (state.smartEnabled && state.smartMode === "active") scheduleSmartIdleTimeout();
  updateSettingsControls();
}

async function setSmartIdleRefreshMinutes(value) {
  const minutes = Number(value);
  if (!SMART_IDLE_REFRESH_MINUTES.has(minutes)) return;

  state.smartIdleRefreshMinutes = minutes;
  localStorage.setItem("codex-led-smart-idle-refresh-minutes", String(minutes));
  if (state.smartEnabled && state.smartMode !== "active") {
    await enterSmartIdleMode();
    return;
  }
  updateAutoRefreshOptions();
  updateSettingsControls();
}

async function refreshQuota({ userInitiated = false } = {}) {
  if (state.loading) return;
  state.loading = true;

  try {
    if (userInitiated && state.smartEnabled) await activateSmartRefresh();
    setStatus("loading", t("loading"), t("reading"));
    el.compactReset.textContent = state.lang === "zh" ? "读取中" : "Loading";
    const quota = await window.codexQuota.getQuota();
    await observeSmartQuota(quota);
    await window.codexQuota.recordHistory(quota).catch(() => null);
    renderQuota(quota);
    if (state.view === "history") await loadHistory();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus("error", t("error"), message || t("unavailable"));
    el.remaining.textContent = "--%";
    el.compactRemaining.textContent = "--%";
    el.compactReset.textContent = "5h --";
    el.primaryText.textContent = "--";
    el.secondaryText.textContent = "--";
    el.planText.textContent = "--";
    setFill(0);
    setCompactFill(0);
    updateWeeklyWarning(null);
  } finally {
    state.loading = false;
  }
}

function renderQuota(quota) {
  state.lastQuota = quota;
  const remaining = normalizePercent(quota.remainingPercent);
  const primaryRemaining = normalizePercent(quota.primary?.remainingPercent ?? quota.remainingPercent);
  setFill(remaining);
  setCompactFill(primaryRemaining);
  el.remaining.textContent = `${remaining}%`;
  el.compactRemaining.textContent = `${primaryRemaining}%`;
  el.compactReset.textContent = formatCompactReset(quota.primary);
  el.primaryText.textContent = formatWindow(quota.primary, "primary");
  el.secondaryText.textContent = formatWindow(quota.secondary, "secondary");
  el.planText.textContent = formatPlan(quota.planType);
  updateWeeklyWarning(quota.secondary);

  const tone = primaryRemaining <= 0 ? "empty" : primaryRemaining < 10 ? "warning" : "ok";
  setStatus(tone, t("ready"), `${t("updated")} ${formatClock(quota.fetchedAt)}`);
}

function updateWeeklyWarning(quotaWindow) {
  const remaining = quotaWindow ? normalizePercent(quotaWindow.remainingPercent) : null;
  const active = remaining !== null && remaining < state.weeklyAlertThreshold;

  el.weeklyWarning.hidden = !active;
  el.body.dataset.weeklyAlert = active ? "true" : "false";
  el.weeklyRemaining.textContent = active ? `${remaining}%` : "--%";

  if (state.weeklyAlertActive === active) return;
  state.weeklyAlertActive = active;
  window.codexQuota.setCompactAlert(active).catch(() => {
    state.weeklyAlertActive = !active;
  });
}

function setStatus(tone, stateText, statusText) {
  el.body.dataset.state = tone;
  el.trafficLight.className = `traffic-light ${tone}`;
  el.statusDot.className = `status-dot ${tone}`;
  el.stateText.textContent = stateText;
  el.statusText.textContent = statusText;
}

function setFill(percent) {
  el.liquidFill.style.height = `${Math.max(6, Math.min(100, percent))}%`;
}

function setCompactFill(percent) {
  el.compactLiquidFill.style.height = `${Math.max(6, Math.min(100, percent))}%`;
}

function normalizePercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function formatWindow(window, kind) {
  if (!window) return "--";
  const remaining = normalizePercent(window.remainingPercent);
  const used = normalizePercent(window.usedPercent);
  const mode = kind === "secondary" ? state.secondaryTimeDisplay : state.primaryTimeDisplay;
  const reset = formatResetDisplay(window.resetsAt, mode, kind === "secondary");
  const resetLabel = mode === "point" ? t("resetsAt") : t("untilReset");
  return `${remaining}% ${t("left")} / ${used}% ${t("used")} · ${resetLabel} ${reset}`;
}

function formatCompactReset(window) {
  const reset = formatResetDisplay(window?.resetsAt, state.compactTimeDisplay, false);
  if (state.compactTimeDisplay === "point") {
    return state.lang === "zh" ? `5h 重置 ${reset}` : `5h reset ${reset}`;
  }
  return state.lang === "zh" ? `5h 剩余 ${reset}` : `5h left ${reset}`;
}

function formatResetDisplay(value, mode, useDays) {
  if (!value) return "--";
  if (mode === "point") return formatResetPoint(value);
  return useDays ? formatResetAsDays(value) : formatReset(value);
}

function formatResetPoint(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat(state.lang === "zh" ? "zh-CN" : "en-US", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function formatReset(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return state.lang === "zh" ? "即将" : "soon";
  const minutes = Math.ceil(diffMs / 60000);
  if (minutes < 60) return state.lang === "zh" ? `${minutes}分钟` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return state.lang === "zh" ? `${hours}小时${rest}分` : `${hours}h ${rest}m`;
}

function formatResetAsDays(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return state.lang === "zh" ? "即将" : "soon";
  const totalHours = Math.ceil(diffMs / 3600000);
  if (totalHours < 24) return state.lang === "zh" ? `${totalHours}小时` : `${totalHours}h`;
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (hours === 0) return state.lang === "zh" ? `${days}天` : `${days}d`;
  return state.lang === "zh" ? `${days}天${hours}小时` : `${days}d ${hours}h`;
}

function formatClock(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatPlan(value) {
  if (!value || value === "unknown") return "--";
  return String(value).replace(/_/g, " ");
}

function setLanguage(value) {
  state.lang = value === "en" ? "en" : "zh";
  localStorage.setItem("codex-led-lang", state.lang);
  applyLabels();
  if (state.view === "history") drawHistoryChart();
  if (state.lastQuota) {
    renderQuota(state.lastQuota);
  } else {
    refreshQuota();
  }
}

function setTheme(value) {
  state.theme = value === "dark" ? "dark" : "light";
  localStorage.setItem("codex-led-theme", state.theme);
  applyTheme();
  updateSettingsControls();
}

function setAutoCheckUpdates(value) {
  state.autoCheckUpdates = Boolean(value);
  localStorage.setItem("codex-led-auto-check-updates", String(state.autoCheckUpdates));
  updateUpdateControls();
  scheduleAutomaticUpdateCheck({ soon: state.autoCheckUpdates });
}

function scheduleAutomaticUpdateCheck({ soon = false } = {}) {
  if (state.updateCheckTimer) {
    clearTimeout(state.updateCheckTimer);
    state.updateCheckTimer = undefined;
  }
  if (!state.autoCheckUpdates) return;

  const lastCheck = Number(localStorage.getItem("codex-led-last-update-check")) || 0;
  const remaining = UPDATE_CHECK_INTERVAL_MS - (Date.now() - lastCheck);
  const delay = soon ? 500 : Math.max(4000, remaining);
  state.updateCheckTimer = setTimeout(async () => {
    state.updateCheckTimer = undefined;
    await checkForUpdates();
    scheduleAutomaticUpdateCheck();
  }, delay);
}

async function checkForUpdates({ manual = false } = {}) {
  if (state.updateChecking) return;
  state.updateChecking = true;
  state.updateStatus = "checking";
  localStorage.setItem("codex-led-last-update-check", String(Date.now()));
  updateUpdateControls();

  try {
    const result = await window.codexQuota.checkForUpdates();
    state.currentVersion = result.currentVersion || state.currentVersion;
    state.availableUpdate = result.updateAvailable ? result : null;
    state.updateStatus = result.updateAvailable ? "available" : "current";

    const notifiedVersion = localStorage.getItem("codex-led-notified-update-version");
    if (result.updateAvailable && state.autoCheckUpdates && notifiedVersion !== result.latestVersion) {
      const shown = await window.codexQuota.notifyUpdate(state.lang).catch(() => false);
      if (shown) localStorage.setItem("codex-led-notified-update-version", result.latestVersion);
    }
  } catch {
    state.updateStatus = "error";
    if (!manual) state.availableUpdate = null;
  } finally {
    state.updateChecking = false;
    updateUpdateControls();
  }
}

function handleUpdateAction() {
  if (state.availableUpdate) {
    window.codexQuota.openUpdatePage().catch(() => {});
    return;
  }
  void checkForUpdates({ manual: true });
}

function setWeeklyAlertThreshold(value) {
  state.weeklyAlertThreshold = normalizeWeeklyThreshold(value);
  localStorage.setItem("codex-led-weekly-threshold", String(state.weeklyAlertThreshold));
  updateSettingsControls();
  if (state.lastQuota) updateWeeklyWarning(state.lastQuota.secondary);
}

function beginCompactDrag(event) {
  if (event.button !== 0) return;
  compactDragState = {
    pointerId: event.pointerId,
    lastX: event.screenX,
    lastY: event.screenY,
    totalX: 0,
    totalY: 0,
    dragged: false
  };
  event.currentTarget.setPointerCapture?.(event.pointerId);
}

function moveCompactDrag(event) {
  if (!compactDragState || event.pointerId !== compactDragState.pointerId) return;
  const dx = event.screenX - compactDragState.lastX;
  const dy = event.screenY - compactDragState.lastY;
  compactDragState.lastX = event.screenX;
  compactDragState.lastY = event.screenY;
  compactDragState.totalX += dx;
  compactDragState.totalY += dy;

  if (Math.abs(compactDragState.totalX) + Math.abs(compactDragState.totalY) > 4) {
    compactDragState.dragged = true;
  }

  if (dx !== 0 || dy !== 0) {
    window.codexQuota.moveWindowBy(dx, dy).catch(() => {});
  }
}

function endCompactDrag(event) {
  if (!compactDragState || event.pointerId !== compactDragState.pointerId) return;
  event.currentTarget.releasePointerCapture?.(event.pointerId);
  suppressCompactClick = compactDragState.dragged && event.currentTarget === el.compactBall;
  compactDragState = undefined;
}

function cancelCompactDrag() {
  compactDragState = undefined;
}

function handleCompactBallClick() {
  if (suppressCompactClick) {
    suppressCompactClick = false;
    return;
  }

  if (compactClickTimer) {
    clearTimeout(compactClickTimer);
    compactClickTimer = undefined;
    refreshQuota({ userInitiated: true });
    return;
  }

  compactClickTimer = setTimeout(() => {
    compactClickTimer = undefined;
    setWindowMode("detail");
  }, COMPACT_DOUBLE_CLICK_MS);
}

for (const dragTarget of [el.compactBall, el.weeklyWarning]) {
  dragTarget.addEventListener("pointerdown", beginCompactDrag);
  dragTarget.addEventListener("pointermove", moveCompactDrag);
  dragTarget.addEventListener("pointerup", endCompactDrag);
  dragTarget.addEventListener("pointercancel", cancelCompactDrag);
}
el.compactBall.addEventListener("click", handleCompactBallClick);
el.historyBtn.addEventListener("click", () => updateDetailView(state.view === "history" ? "main" : "history"));
el.settingsBtn.addEventListener("click", () => updateDetailView("settings"));
el.settingsBackBtn.addEventListener("click", () => updateDetailView("main"));
el.historyBackBtn.addEventListener("click", () => updateDetailView("main"));
el.historyExportBtn.addEventListener("click", () => void exportHistoryRecords());
el.historyMetricSelect.addEventListener("change", () => setHistoryMetric(el.historyMetricSelect.value));
el.historyChart.addEventListener("mousemove", handleHistoryChartPointerMove);
el.historyChart.addEventListener("mouseleave", hideHistoryTooltip);
el.languageSelect.addEventListener("change", () => setLanguage(el.languageSelect.value));
el.themeSelect.addEventListener("change", () => setTheme(el.themeSelect.value));
el.autoUpdateToggle.addEventListener("change", () => setAutoCheckUpdates(el.autoUpdateToggle.checked));
el.checkUpdateBtn.addEventListener("click", handleUpdateAction);
el.weeklyThresholdSelect.addEventListener("change", () => setWeeklyAlertThreshold(el.weeklyThresholdSelect.value));
el.primaryTimeDisplaySelect.addEventListener("change", () => setTimeDisplay("primary", el.primaryTimeDisplaySelect.value));
el.secondaryTimeDisplaySelect.addEventListener("change", () => setTimeDisplay("secondary", el.secondaryTimeDisplaySelect.value));
el.compactTimeDisplaySelect.addEventListener("change", () => setTimeDisplay("compact", el.compactTimeDisplaySelect.value));
el.regularRefreshSelect.addEventListener("change", () => void setRegularRefreshMinutes(el.regularRefreshSelect.value));
el.smartEnabledToggle.addEventListener("change", () => void setSmartEnabled(el.smartEnabledToggle.checked));
el.smartActiveRefreshSelect.addEventListener("change", () => void setSmartActiveRefreshMinutes(el.smartActiveRefreshSelect.value));
el.smartIdleTimeoutSelect.addEventListener("change", () => setSmartIdleMinutes(el.smartIdleTimeoutSelect.value));
el.smartIdleRefreshSelect.addEventListener("change", () => void setSmartIdleRefreshMinutes(el.smartIdleRefreshSelect.value));
for (const control of [el.compactSizeRange, el.quotaFontSizeRange, el.resetFontSizeRange]) {
  control.addEventListener("input", scheduleCompactAppearanceUpdate);
}
for (const button of el.historyPeriodButtons) {
  button.addEventListener("click", () => setHistoryPeriod(button.dataset.period));
}
el.historyPrevBtn.addEventListener("click", () => shiftHistoryPeriod(-1));
el.historyNextBtn.addEventListener("click", () => shiftHistoryPeriod(1));
el.refreshBtn.addEventListener("click", () => refreshQuota({ userInitiated: true }));
el.minimizeBtn.addEventListener("click", async () => {
  updateWindowMode(await window.codexQuota.minimize());
});
el.closeBtn.addEventListener("click", () => window.codexQuota.close());
el.pinBtn.addEventListener("click", async () => {
  updatePinButton(await window.codexQuota.setAlwaysOnTop(!state.alwaysOnTop));
});
el.autoRefreshSelect.addEventListener("change", () => {
  void setMainAutoRefreshMinutes(el.autoRefreshSelect.value);
});

window.codexQuota.onRefresh(() => refreshQuota({ userInitiated: true }));
window.codexQuota.onAlwaysOnTopChanged(updatePinButton);
window.codexQuota.onWindowModeChanged(updateWindowMode);
window.addEventListener("resize", () => {
  if (state.view === "history") drawHistoryChart();
});

function configureAutoRefresh() {
  if (state.autoRefreshTimer) {
    clearInterval(state.autoRefreshTimer);
    state.autoRefreshTimer = undefined;
  }

  if (state.autoRefreshMinutes > 0) {
    state.autoRefreshTimer = setInterval(() => refreshQuota(), state.autoRefreshMinutes * 60 * 1000);
  }
}

(async () => {
  state.currentVersion = await window.codexQuota.getAppVersion().catch(() => "");
  applyCompactAppearance(await window.codexQuota.getCompactAppearance());
  updateWindowMode(await window.codexQuota.getWindowMode());
  updatePinButton(await window.codexQuota.getAlwaysOnTop());
  state.autoRefreshMinutes = await window.codexQuota.getAutoRefreshMinutes();
  if (state.smartEnabled) {
    if (state.smartMode === "manual") {
      await setEffectiveAutoRefreshMinutes(0);
    } else if (state.smartMode === "idle") {
      await enterSmartIdleMode();
    } else {
      await setEffectiveAutoRefreshMinutes(state.smartActiveRefreshMinutes);
      scheduleSmartIdleTimeout();
    }
  } else {
    state.regularRefreshMinutes = state.autoRefreshMinutes;
    localStorage.setItem("codex-led-regular-refresh-minutes", String(state.regularRefreshMinutes));
    configureAutoRefresh();
  }
  applyTheme();
  updateDetailView("main");
  applyLabels();
  refreshQuota();
  scheduleAutomaticUpdateCheck();
})();
