# v1.2.1 Verification

Verified on Windows with Electron 31.7.7 on 2026-10-03. All UI screenshots and runtime fixtures use synthetic data.

- 54 Node tests passed, including time-anchored pan coordinates, adaptive tick density, the inclusive ten-minute boundary, fine grids, cursor-centered zoom, and calendar-day ticks across daylight-saving transitions.
- Native left-button drag checks passed at 100% and 150% display scaling, for all four periods both zoomed and unzoomed. The same data point and shared time grids/labels move by 100 pixels for a 100-pixel pointer movement. Right-button drag leaves the viewport unchanged. Cross-date loading and refresh preserve the viewport.
- UI checks passed in Chinese and English, light and dark themes, at 100% and 150% display scaling, over nine time spans. Chart controls and the default-page setting fit the existing window. The Y plot coordinates stay fixed during zoom. Representative screenshots were inspected.
- Real main/preload/renderer integration passed against source and the packaged app.asar: all three default pages, preference persistence after renderer reload, double-click refresh, independent chart pinning with the ball pin both on and off, blur suppression while pinned, and restored collapse after unpinning or leaving the chart.
- Packaged integration also exercised report-worker startup, history recording, taskbar-close interception, destroyed-window tray recovery, the TaskbarCreated callback, and the four tray icon states.
- Existing wheel, drag, point-tooltip, reset-view, close-lifecycle, and twelve report-layout regression checks passed.
- Package identity and app-data location remain unchanged, retaining existing settings, quota history, and token-report files. Real user data was not used in tests or copied into the release.

## Limits

- macOS source and the arm64/x64 GitHub Actions workflow are supplied. DMGs were not built on this Windows host, and no Mac hardware, signing, or notarization test was performed.
- Focus-loss events and native always-on-top state were exercised in hidden isolated windows. Full-screen desktop behavior and a live Explorer crash were not induced.
- Test images show demo values, not account usage. No GitHub commit, push, or release was published by this local build.
