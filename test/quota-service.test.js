const assert = require("node:assert/strict");
const test = require("node:test");
const { findCodexCandidates } = require("../src/main/quota-service");

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
