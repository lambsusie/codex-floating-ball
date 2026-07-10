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
    settingsSubtitle: "界面与报警",
    back: "返回",
    language: "语言",
    theme: "主题",
    themeLight: "浅色",
    themeDark: "深色",
    weeklyAlert: "周额度报警",
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
    weeklyQuota: "周额度"
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
    settingsSubtitle: "Display and alerts",
    back: "Back",
    language: "Language",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    weeklyAlert: "Weekly alert",
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
    weeklyQuota: "7d quota"
  }
};

const DEFAULT_WEEKLY_ALERT_THRESHOLD = 5;
const COMPACT_DOUBLE_CLICK_MS = 260;

const state = {
  lang: getStoredLanguage(),
  theme: getStoredTheme(),
  loading: false,
  alwaysOnTop: true,
  mode: "compact",
  view: "main",
  weeklyAlertThreshold: getStoredWeeklyThreshold(),
  weeklyAlertActive: false,
  autoRefreshMinutes: 5,
  autoRefreshTimer: undefined,
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
  weeklyThresholdLabel: document.getElementById("weeklyThresholdLabel"),
  weeklyThresholdSelect: document.getElementById("weeklyThresholdSelect"),
  settingsHint: document.getElementById("settingsHint")
};

let compactClickTimer;
let compactDragState;
let suppressCompactClick = false;

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

function getStoredWeeklyThreshold() {
  return normalizeWeeklyThreshold(localStorage.getItem("codex-led-weekly-threshold"));
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
  el.weeklyThresholdLabel.textContent = t("weeklyAlert");
  el.weeklyThresholdSelect.setAttribute("aria-label", t("weeklyAlert"));
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
  updatePinButton(state.alwaysOnTop);
}

function updateSettingsControls() {
  el.languageSelect.value = state.lang;
  el.themeSelect.value = state.theme;
  el.themeSelect.options[0].textContent = t("themeLight");
  el.themeSelect.options[1].textContent = t("themeDark");
  el.weeklyThresholdSelect.value = String(state.weeklyAlertThreshold);
}

function updateAutoRefreshOptions() {
  for (const option of el.autoRefreshSelect.options) {
    const minutes = Number(option.value);
    option.textContent = minutes === 0 ? t("autoManual") : `${minutes}${t("minute")}`;
  }
  el.autoRefreshSelect.value = String(state.autoRefreshMinutes);
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
  state.view = view === "settings" ? "settings" : "main";
  el.body.dataset.view = state.view;
  el.settingsPanel.hidden = state.view !== "settings";
}

function applyTheme() {
  el.body.dataset.theme = state.theme;
}

async function refreshQuota() {
  if (state.loading) return;
  state.loading = true;
  setStatus("loading", t("loading"), t("reading"));
  el.compactReset.textContent = state.lang === "zh" ? "读取中" : "Loading";

  try {
    const quota = await window.codexQuota.getQuota();
    renderQuota(quota);
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
  const reset = window.resetsAt ? (kind === "secondary" ? formatResetAsDays(window.resetsAt) : formatReset(window.resetsAt)) : "--";
  return `${remaining}% ${t("left")} / ${used}% ${t("used")} · ${t("reset")} ${reset}`;
}

function formatCompactReset(window) {
  const reset = window?.resetsAt ? formatReset(window.resetsAt) : "--";
  return state.lang === "zh" ? `5h 重置 ${reset}` : `5h reset ${reset}`;
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
    refreshQuota();
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
el.settingsBtn.addEventListener("click", () => updateDetailView("settings"));
el.settingsBackBtn.addEventListener("click", () => updateDetailView("main"));
el.languageSelect.addEventListener("change", () => setLanguage(el.languageSelect.value));
el.themeSelect.addEventListener("change", () => setTheme(el.themeSelect.value));
el.weeklyThresholdSelect.addEventListener("change", () => setWeeklyAlertThreshold(el.weeklyThresholdSelect.value));
el.refreshBtn.addEventListener("click", refreshQuota);
el.minimizeBtn.addEventListener("click", async () => {
  updateWindowMode(await window.codexQuota.minimize());
});
el.closeBtn.addEventListener("click", () => window.codexQuota.close());
el.pinBtn.addEventListener("click", async () => {
  updatePinButton(await window.codexQuota.setAlwaysOnTop(!state.alwaysOnTop));
});
el.autoRefreshSelect.addEventListener("change", async () => {
  const minutes = Number(el.autoRefreshSelect.value);
  state.autoRefreshMinutes = await window.codexQuota.setAutoRefreshMinutes(minutes);
  configureAutoRefresh();
  updateAutoRefreshOptions();
});

window.codexQuota.onRefresh(refreshQuota);
window.codexQuota.onAlwaysOnTopChanged(updatePinButton);
window.codexQuota.onWindowModeChanged(updateWindowMode);

function configureAutoRefresh() {
  if (state.autoRefreshTimer) {
    clearInterval(state.autoRefreshTimer);
    state.autoRefreshTimer = undefined;
  }

  if (state.autoRefreshMinutes > 0) {
    state.autoRefreshTimer = setInterval(refreshQuota, state.autoRefreshMinutes * 60 * 1000);
  }
}

(async () => {
  updateWindowMode(await window.codexQuota.getWindowMode());
  updatePinButton(await window.codexQuota.getAlwaysOnTop());
  state.autoRefreshMinutes = await window.codexQuota.getAutoRefreshMinutes();
  configureAutoRefresh();
  applyTheme();
  updateDetailView("main");
  applyLabels();
  refreshQuota();
})();
