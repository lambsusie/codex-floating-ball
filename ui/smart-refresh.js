(function exposeSmartRefreshUtils(globalObject) {
  function normalizeOptionalPercent(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return Math.max(0, Math.min(100, Math.round(number)));
  }

  function getQuotaUsageFingerprint(quota) {
    return JSON.stringify({
      primaryRemaining: normalizeOptionalPercent(quota?.primary?.remainingPercent),
      secondaryRemaining: normalizeOptionalPercent(quota?.secondary?.remainingPercent)
    });
  }

  function getDisplayedRefreshMinutes(state) {
    if (!state.smartEnabled) return state.regularRefreshMinutes;
    if (state.smartMode === "manual") return 0;
    if (state.smartMode === "idle") return state.smartIdleRefreshMinutes;
    return state.smartActiveRefreshMinutes;
  }

  const api = { getQuotaUsageFingerprint, getDisplayedRefreshMinutes };
  globalObject.smartRefreshUtils = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
