# Codex Floating Ball

English | [中文](README.md)

A desktop Codex quota widget derived from [codex-led-widget](https://github.com/xicunwus2025-sys/codex-led-widget). This is an independent community project, not an official OpenAI product.

## Lightweight 2.0 Beta

**2.0.0-beta.1** migrates the v1.2.2 feature set to Tauri, Rust and the system WebView. It no longer ships Electron, Chromium or Node.js. This is a migration beta, not a long-term-validated stable release.

Features retained:

- Draggable floating ball, click to open, double-click to refresh, independently adjustable ball and text sizes.
- Five-hour and weekly limits, weekly-only accounts, configurable alerts and countdown/reset-time displays.
- Automatic and smart active/idle refresh, with synchronized interval controls.
- Historical 5h/day/week/month charts, left-button panning, wheel zoom, adaptive ticks, tooltips, used/remaining metrics and CSV export.
- Local-token daily, weekly and monthly reports using the original deduplication algorithm. Scans run at 23:59:59 Beijing time, settle again after midnight and catch up on startup. The app cannot schedule scans while it is closed.
- English/Chinese, system/light/dark themes, four palettes, configurable entry page, chart pinning, tray integration and optional update notifications.
- macOS source includes menu-bar integration, glass effects and reduced-transparency handling, pending real-Mac validation.

## Run

**Recommended: [Windows x64 installer](https://github.com/lambsusie/codex-floating-ball/releases/download/v2.0.0-beta.1/Codex-Floating-Ball-2.0.0-beta.1-win-x64-setup.exe)**. Follow the installation prompts. It downloads Microsoft Edge WebView2 Runtime if missing, so first-time setup may require an Internet connection.

The [standalone executable](https://github.com/lambsusie/codex-floating-ball/releases/download/v2.0.0-beta.1/Codex-Floating-Ball-2.0.0-beta.1-win-x64.exe) is an alternative **only for users who already have WebView2 installed**. It does not install WebView2 or store its profile beside the EXE.

This release provides Windows x64 packages only and is explicitly marked **Pre-release**. No macOS or Linux binary is published. See the [release notes and SHA256 checksums](https://github.com/lambsusie/codex-floating-ball/releases/tag/v2.0.0-beta.1), or keep using the [v1.2.2 stable release](https://github.com/lambsusie/codex-floating-ball/releases/tag/v1.2.2). Source lives on this beta branch; stable `main` remains unchanged.

Install and sign into the official Codex app, or provide a compatible Codex CLI. `CODEX_CLI_PATH` overrides executable discovery; `CODEX_HOME` overrides the local log directory.

Package sizes exclude shared WebView2, the Codex app, user data and runtime memory. No Codex CLI is bundled. Quit the older widget before testing this version. Update checks only offer a GitHub release link; updates are not installed automatically.

## Migration and Privacy

On first launch, the app copies legacy quota history, token reports, metadata index and preferences into a separate profile. Electron preferences are read from a database snapshot, never from a writable original database.

- Windows: `%APPDATA%\codex-floating-ball` to `%APPDATA%\io.github.lambsusie.codexfloatingball.v2`.
- macOS: `~/Library/Application Support/codex-floating-ball` to `~/Library/Application Support/io.github.lambsusie.codexfloatingball.v2`.

The old app and original data remain unchanged. Subsequent records are **not synchronized between versions**. Check `migration.json` in the new profile if import is partial, and keep both profiles until the issue is resolved.

Token indexing retains usage metadata, not conversation content. Never publish user profiles, `qa/`, Codex logs or credentials with the source. Quota requests use the local Codex app-server; update checks contact this project's GitHub Releases API.

## Screenshots

These screenshots use synthetic data, not personal account usage or conversations.

![Windows beta usage chart](docs/images/v2.0.0-beta.1-chart-light.png)
![Palettes and English settings](docs/images/v2.0.0-beta.1-settings-dark-en.png)
![Local-token reports](docs/images/v2.0.0-beta.1-reports-light.png)

## Build from source

Install Node.js 24, Rust stable and platform Tauri build prerequisites. Windows needs C++ Build Tools and the Windows SDK; macOS needs Xcode Command Line Tools.

```sh
npm ci
npm test
cargo test --locked --manifest-path src-tauri/Cargo.toml
npm run build
```

On macOS, use `npm run build -- --bundles app,dmg`.

The manually triggered `build-desktop.yml` workflow builds Windows x64, Apple Silicon and Intel Mac artifacts without publishing a release. macOS uses ad-hoc signing, not Developer ID signing or notarization. Signature-integrity verification does not guarantee Gatekeeper acceptance; do not disable system protections to work around a malware warning.

## Validation Status

Windows testing covers live quota reads, migration from copies of real legacy data, original-algorithm report parity and packaged WebView2 interaction tests. macOS has not been built or run locally. Multi-monitor DPI transitions, real Explorer crashes, sleep/resume, notification delivery and multi-day operation still need environment-specific testing. No Linux release is provided.

`reference/` retains v1.2.2 token algorithms for extraction and parity tests; these Node modules and test material are excluded from the application bundle. See the included MIT license and upstream attribution.
