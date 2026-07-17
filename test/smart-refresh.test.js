const test = require("node:test");
const assert = require("node:assert/strict");
const { getQuotaUsageFingerprint, getDisplayedRefreshMinutes } = require("../src/renderer/smart-refresh");

test("quota fingerprint ignores reset-time-only changes", () => {
  const before = {
    primary: { remainingPercent: 72, resetsAt: "2026-07-16T10:00:00Z" },
    secondary: { remainingPercent: 41, resetsAt: "2026-07-20T10:00:00Z" }
  };
  const after = {
    primary: { remainingPercent: 72, resetsAt: "2026-07-16T10:01:00Z" },
    secondary: { remainingPercent: 41, resetsAt: "2026-07-20T10:01:00Z" }
  };

  assert.equal(getQuotaUsageFingerprint(before), getQuotaUsageFingerprint(after));
});

test("quota fingerprint changes when remaining quota changes", () => {
  const before = { primary: { remainingPercent: 72 }, secondary: { remainingPercent: 41 } };
  const after = { primary: { remainingPercent: 71 }, secondary: { remainingPercent: 41 } };

  assert.notEqual(getQuotaUsageFingerprint(before), getQuotaUsageFingerprint(after));
});

test("main selector displays manual while smart refresh is paused", () => {
  assert.equal(
    getDisplayedRefreshMinutes({
      smartEnabled: true,
      smartMode: "manual",
      smartActiveRefreshMinutes: 1,
      regularRefreshMinutes: 5
    }),
    0
  );
});

test("main selector displays the synchronized smart interval while active", () => {
  assert.equal(
    getDisplayedRefreshMinutes({
      smartEnabled: true,
      smartMode: "active",
      smartActiveRefreshMinutes: 10,
      regularRefreshMinutes: 5
    }),
    10
  );
});
