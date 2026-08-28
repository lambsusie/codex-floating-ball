const assert = require("node:assert/strict");
const test = require("node:test");
const {
  DEFAULT_COMPACT_APPEARANCE,
  normalizeCompactAppearance
} = require("../src/main/compact-appearance");

test("uses stable defaults", () => {
  assert.deepEqual(normalizeCompactAppearance(), DEFAULT_COMPACT_APPEARANCE);
});

test("clamps fonts to the selected ball size", () => {
  const value = normalizeCompactAppearance({
    ballSize: 88,
    quotaFontSize: 64,
    resetFontSize: 24
  });
  assert.equal(value.ballSize, 88);
  assert.ok(value.quotaFontSize <= 30);
  assert.ok(value.resetFontSize <= 12);
  assert.ok(value.quotaFontSize * 1.08 + value.resetFontSize * 1.25 + 6 <= value.ballSize * 0.58 + 1);
});
