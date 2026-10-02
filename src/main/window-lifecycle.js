function isLive(window) {
  return Boolean(window && !window.isDestroyed());
}

function keepOffTaskbar(window) {
  if (!isLive(window)) return false;
  window.setSkipTaskbar(true);
  return true;
}

function attachWindowLifecycle(window, { isQuitting, collapse, onClosed }) {
  window.on("close", (event) => {
    if (isQuitting()) return;
    event.preventDefault();
    collapse();
    keepOffTaskbar(window);
  });
  window.on("closed", () => onClosed(window));
  for (const event of ["show", "restore", "focus"]) {
    window.on(event, () => keepOffTaskbar(window));
  }
}

module.exports = { isLive, keepOffTaskbar, attachWindowLifecycle };
