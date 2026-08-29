const test = require("node:test");
const assert = require("node:assert/strict");
const {
  LATEST_RELEASE_URL,
  checkForUpdate,
  compareVersions,
  isAllowedReleaseUrl
} = require("../src/main/update-service");

test("compares stable and prerelease semantic versions", () => {
  assert.equal(compareVersions("1.2.0", "1.1.9"), 1);
  assert.equal(compareVersions("v1.1.0", "1.1.0"), 0);
  assert.equal(compareVersions("1.1.0-beta.2", "1.1.0-beta.1"), 1);
  assert.equal(compareVersions("1.1.0", "1.1.0-beta.2"), 1);
});

test("accepts only this project's GitHub release pages", () => {
  assert.equal(isAllowedReleaseUrl("https://github.com/lambsusie/codex-floating-ball/releases/tag/v1.2.0"), true);
  assert.equal(isAllowedReleaseUrl("https://github.com/another/repository/releases/tag/v1.2.0"), false);
  assert.equal(isAllowedReleaseUrl("https://example.com/lambsusie/codex-floating-ball/releases/tag/v1.2.0"), false);
});

test("checks the latest GitHub release without authentication", async () => {
  let request;
  const result = await checkForUpdate({
    currentVersion: "1.1.0",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 200,
        json: async () => ({
          tag_name: "v1.2.0",
          html_url: "https://github.com/lambsusie/codex-floating-ball/releases/tag/v1.2.0"
        })
      };
    }
  });

  assert.equal(request.url, LATEST_RELEASE_URL);
  assert.equal(request.options.headers.Accept, "application/vnd.github+json");
  assert.equal(result.updateAvailable, true);
  assert.equal(result.latestVersion, "1.2.0");
});

test("rejects malformed release responses", async () => {
  await assert.rejects(
    checkForUpdate({
      currentVersion: "1.1.0",
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ tag_name: "latest", html_url: "https://example.com/download" })
      })
    }),
    /invalid release/
  );
});
