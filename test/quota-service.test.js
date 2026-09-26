const assert = require("node:assert/strict");
const test = require("node:test");
const { findCodexCandidates, normalizeSnapshot } = require("../src/main/quota-service");

test("macOS candidates include the Codex app and common CLI install paths", () => {
  const candidates = findCodexCandidates({
    platform: "darwin",
    homeDir: "/Users/tester"
  });

  assert.deepEqual(candidates, [
    "/Applications/Codex.app/Contents/Resources/codex",
    "/Users/tester/Applications/Codex.app/Contents/Resources/codex",
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
    "/Users/tester/.local/bin/codex",
    "/Users/tester/.npm-global/bin/codex"
  ]);
});

test("Unix candidates use POSIX paths", () => {
  assert.deepEqual(
    findCodexCandidates({ platform: "linux", homeDir: "/home/tester" }),
    [
      "/usr/local/bin/codex",
      "/home/tester/.local/bin/codex",
      "/home/tester/.npm-global/bin/codex"
    ]
  );
});

test("detects weekly-only quota snapshots without inventing a five-hour window", () => {
  const snapshot = normalizeSnapshot({
    planType: "pro",
    primary: null,
    secondary: { usedPercent: 24, windowDurationMins: 10080, resetsAt: 1780000000 }
  });

  assert.equal(snapshot.primary, null);
  assert.equal(snapshot.secondary.remainingPercent, 76);
  assert.equal(snapshot.remainingPercent, 76);
  assert.equal(snapshot.hasFiveHourLimit, false);
  assert.equal(snapshot.quotaMode, "weekly-only");
});

test("accepts remainingPercent when a quota window omits usedPercent", () => {
  const snapshot = normalizeSnapshot({
    primary: { remainingPercent: 63 },
    secondary: null
  });
  assert.equal(snapshot.primary.usedPercent, 37);
  assert.equal(snapshot.primary.remainingPercent, 63);
});

test("treats an empty primary quota object as no five-hour limit", () => {
  const snapshot = normalizeSnapshot({
    primary: { usedPercent: null, remainingPercent: null },
    secondary: { usedPercent: 12 }
  });
  assert.equal(snapshot.primary, null);
  assert.equal(snapshot.secondary.remainingPercent, 88);
  assert.equal(snapshot.quotaMode, "weekly-only");
});
