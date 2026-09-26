const assert = require("node:assert/strict");
const test = require("node:test");
const { getThemeState, normalizeThemeSource } = require("../src/main/theme-service");

test("normalizes invalid theme sources to system", () => {
  assert.equal(normalizeThemeSource("dark"), "dark");
  assert.equal(normalizeThemeSource("unexpected"), "system");
});

test("resolves system theme from nativeTheme", () => {
  assert.deepEqual(
    getThemeState({ shouldUseDarkColors: true, prefersReducedTransparency: false }, "win32", "system"),
    {
      source: "system",
      resolvedTheme: "dark",
      platform: "win32",
      prefersReducedTransparency: false,
      glassEnabled: false
    }
  );
});

test("disables macOS glass when reduced transparency is enabled", () => {
  const state = getThemeState(
    { shouldUseDarkColors: false, prefersReducedTransparency: true },
    "darwin",
    "light"
  );
  assert.equal(state.glassEnabled, false);
  assert.equal(state.resolvedTheme, "light");
});
