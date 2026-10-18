# v1.2.2 Verification

Date: 2026-10-17. Host: Windows 10 x64. Electron: 31.7.7.

## Scope

- Shared overview/chart refresh selector with no extra quota timer.
- Four persisted palettes covering light, dark, system, compact and detail views.
- No app identity, user-data path, history schema, or token-report schema changes.

## Automated Checks

- `node --test`: 54 tests passed, including history, smart refresh, theme resolution, CSV export, token-report aggregation, update checks and window lifecycle.
- `main-integration-smoke.js`: source and packaged ASAR passed using the real main process, preload and renderer, with isolated temporary data and synthetic quota.
- Both refresh selectors tested at Manual / 1 / 5 / 10 / 30 / 60 minutes, including native setting synchronization. Only one quota refresh interval remains active.
- Smart idle transitions tested at 30 minutes, 60 minutes and Manual. Changing the chart selector restores active mode and synchronizes its interval; explicit refresh reactivates smart mode.
- Palette preference survives renderer restart; invalid stored palette falls back to blue.
- Existing default-page selection, double-click refresh, independent chart pinning, blur collapse, taskbar-close collapse, destroyed-window recovery and simulated TaskbarCreated handling passed.
- `v122-smoke-main.js`: four palettes x two appearances x two languages x four detail views. Footer controls, long export messages, report overflow, palette selection and persistence checked.
- Text/selected-control contrast checked at >= 4.5:1; chart-series contrast at >= 3:1. Canvas pixels verified against palette series colors. Warning colors remain unchanged across palettes.
- Eight compact-ball palette/appearance combinations captured. Simulated macOS material and opaque fallback styles checked for all palettes and appearances. This is not a Mac hardware test.
- Source and packaged UI checks cover 100% and 150% scale; corresponding JSON results and screenshots are in `qa-v1.2.2`.
- Chart regression: four time ranges, zoomed and unzoomed, left-drag follows the mouse by 100 pixels; grids and ticks move equally, Y stays fixed, right-drag is inert, cross-date records load, refresh retains viewport.
- Additional regression passed: wheel/drag/tooltip/reset, 12 report layouts and native close lifecycle.
- All 19 files under `src` were byte-compared with packaged ASAR entries. Packaged version is 1.2.2 and app name remains codex-floating-ball.

## Visual Review

Inspected Chinese and English chart footers, palette selection, light and dark overviews, and a compact ball at 150% scale. The 520 x 360 detail window size is unchanged. Windows panels remain opaque and rounded. Screenshots use synthetic demonstration data, not the user's usage history.

## Limits

## Publication verification (2026-10-18)

- Re-ran all 54 unit tests, source and packaged main-process integration, four-palette UI checks at 100% / 150% scale, and chart-drag regressions.
- The legacy tooltip smoke initially failed when selecting the first chart point near the viewport edge in a partial current day. Its fixture now uses a complete historical day and explicitly selects an interior data point. The full wheel/drag/tooltip/reset, 12-report-layout and close-lifecycle smoke passes with that deterministic fixture; no application runtime code was changed for this adjustment.
- Version 1.2.2 and all 19 packaged source files were verified against the source tree. Secret-pattern, staged-file, and README-image checks passed.

## Publication limits

- No real account quota request was needed for these UI changes; tests used synthetic quota and isolated report fixtures. The user's running app and personal data were not changed.
- Windows portable EXE was built locally; its packaged main/preload/renderer stack was exercised in the test harness, not launched against the user's profile.
- macOS source and unsigned arm64/x64 build workflow are included. DMGs must be built on GitHub Actions or a Mac; native macOS appearance and behavior have not been hardware-tested here.
- Nothing was uploaded to GitHub.
