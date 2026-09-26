const THEME_SOURCES = new Set(["system", "light", "dark"]);

function normalizeThemeSource(value) {
  return THEME_SOURCES.has(value) ? value : "system";
}

function getThemeState(nativeTheme, platform = process.platform, source = "system") {
  const normalizedSource = normalizeThemeSource(source);
  const resolvedTheme = normalizedSource === "system"
    ? (nativeTheme.shouldUseDarkColors ? "dark" : "light")
    : normalizedSource;
  const prefersReducedTransparency = Boolean(nativeTheme.prefersReducedTransparency);

  return {
    source: normalizedSource,
    resolvedTheme,
    platform,
    prefersReducedTransparency,
    glassEnabled: platform === "darwin" && !prefersReducedTransparency
  };
}

module.exports = {
  getThemeState,
  normalizeThemeSource
};
