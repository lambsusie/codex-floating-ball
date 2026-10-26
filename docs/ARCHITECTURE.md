# Migration Notes

The v1.2.2 renderer is reused, with its Electron preload contract implemented by `ui/bridge.js`. The bridge only invokes an allowlisted Rust command handler. It does not expose a filesystem or shell API to the renderer.

## Components

- `src-tauri/src/main.rs`: window lifecycle, tray, settings, dialogs, update checks and report scheduling.
- `src-tauri/src/quota.rs`: a supervised local Codex app-server process, timeouts and normalized limits.
- `src-tauri/src/storage.rs`: isolated legacy migration, settings, history and CSV export.
- `src-tauri/src/reports.rs`: incremental, metadata-only JSONL scanning with partial-line recovery.
- `ui/report-worker.js`: original report aggregation in a Worker, keeping the visible UI responsive.
- `ui/report-core.js`: generated pure functions from the original implementation retained under `reference/`.
- `ui/renderer.js`, `history-utils.js`, `smart-refresh.js`, `report-view.js`: retained UI and behavior.

Settings are copied from the legacy profile once and persisted in the new profile. The legacy LevelDB database is opened only after its files have been copied. Marker files and snapshots are local diagnostics, not release assets. Test profiles are ignored by Git and excluded by the release staging allowlist.

The report scanner reads only session and archived-session JSONL files. It selects usage and session identifiers before storing any metadata; the aggregator preserves the original handling of duplicate responses, forks, cumulative resets and archived logs. Local tokens are not an estimate of account-wide billable usage or a fixed conversion from quota percentages.

## Test Commands

`npm test` runs pure JavaScript tests. `cargo test --manifest-path src-tauri/Cargo.toml` tests the native components. `scripts/qa-full.cjs` runs packaged Windows WebView2 tests with synthetic data. It needs Playwright and pngjs in the Node module search path. `scripts/qa-real.cjs` is an explicit local-only test using the current user's existing profile and Codex logs; it must never run in public CI or publish its test profile.

## Platform Sources

- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)
- [Tauri Windows installer and WebView2 options](https://v2.tauri.app/distribute/windows-installer/)
- [NSWorkspace accessibility API](https://docs.rs/objc2-app-kit/latest/objc2_app_kit/struct.NSWorkspace.html)
- [GitHub-hosted runner labels](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)

The Mac build workflow uses separate native arm64 and Intel runners. Ad-hoc signing provides bundle integrity, not developer identity or notarization. No Mac binary is asserted to be tested until the workflow and real-device checks succeed.
