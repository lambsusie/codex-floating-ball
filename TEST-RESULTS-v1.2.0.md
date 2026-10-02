# v1.2.0 Verification

Tested on Windows using Electron 31.7.7. Screenshots use synthetic data.

- 50 Node unit tests passed: quota parsing, history/export, smart refresh, theme, updates, free-panning viewport behavior, token counting/deduplication, date boundaries, incremental reads, worker persistence, and close lifecycle.
- Direct-drag regression: all four time periods, zoomed and unzoomed, at 100% and 150% display scaling. A 100-pixel left drag moves the same recorded point right by 100 pixels; reversing the drag restores its original position. Right-button dragging leaves the viewport unchanged and the context menu is suppressed. Cross-date loading and refresh preserve the viewport.
- Hidden Electron UI tests: wheel zoom inside/outside the plot, point tooltips, reset zoom, and 12 report layouts (Chinese/English, light/dark, day/week/month). The focused drag regression covers native left-button dragging and ignored right-button dragging.
- Main-process integration: real main/preload/renderer stack, isolated app data, token-report worker and IPC, taskbar-close interception, tray recreation after window destruction, and four tray states.
- Repeated integration against the packaged `app.asar` to verify worker execution after packaging.
- Windows `TaskbarCreated` was posted only to the isolated test window and its callback was verified. The user's Explorer process was not restarted or killed.
- The raw-log reader was checked against a previously audited 123-day local dataset: all six daily token fields matched, with identical results after an incremental rescan. Private usage data is not included in this source/release package.

## Limits

- macOS DMGs must be built with the supplied GitHub Actions workflow or on a Mac. No macOS hardware or Apple signing/notarization test was performed here.
- An actual Explorer crash was not induced. The shell-recovery message and destroyed-window paths were tested without disrupting the desktop.
- The daily scheduler uses real local logs and Beijing-time boundaries. A live overnight soak test has not been performed; date-boundary, persistence and backfill behavior are covered by automated tests.
