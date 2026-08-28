const DEFAULT_COMPACT_APPEARANCE = Object.freeze({
  ballSize: 120,
  quotaFontSize: 27,
  resetFontSize: 11
});

function normalizeCompactAppearance(value = {}) {
  const ballSize = clampRound(value.ballSize, 88, 200, DEFAULT_COMPACT_APPEARANCE.ballSize);
  let quotaFontSize = clampRound(value.quotaFontSize, 20, 64, DEFAULT_COMPACT_APPEARANCE.quotaFontSize);
  let resetFontSize = clampRound(value.resetFontSize, 9, 24, DEFAULT_COMPACT_APPEARANCE.resetFontSize);

  quotaFontSize = Math.min(quotaFontSize, Math.floor(ballSize * 0.35));
  resetFontSize = Math.min(resetFontSize, Math.floor(ballSize * 0.14));

  const availableHeight = ballSize * 0.58;
  const requiredHeight = quotaFontSize * 1.08 + resetFontSize * 1.25 + 6;
  if (requiredHeight > availableHeight) {
    const scale = availableHeight / requiredHeight;
    quotaFontSize = Math.max(20, Math.floor(quotaFontSize * scale));
    resetFontSize = Math.max(9, Math.floor(resetFontSize * scale));
  }

  return { ballSize, quotaFontSize, resetFontSize };
}

function clampRound(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

module.exports = { DEFAULT_COMPACT_APPEARANCE, normalizeCompactAppearance };
