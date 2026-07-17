(function exposeSmartRefreshUtils(globalObject) {
  function normalizePercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(100, Math.round(number)));
  }

  function getQuotaUsageFingerprint(quota) {
    const primary = quota.primary || {};
    const secondary = quota.secondary || {};
    return JSON.stringify({
      primaryRemaining: normalizePercent(primary.remainingPercent ?? quota.remainingPercent),
      secondaryRemaining: normalizePercent(secondary.remainingPercent)
    });
  }

  function getDisplayedRefreshMinutes(state) {
    if (!state.smartEnabled) return state.regularRefreshMinutes;
    return state.smartMode === "manual" ? 0 : state.smartActiveRefreshMinutes;
  }

  const api = { getQuotaUsageFingerprint, getDisplayedRefreshMinutes };
  globalObject.smartRefreshUtils = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
