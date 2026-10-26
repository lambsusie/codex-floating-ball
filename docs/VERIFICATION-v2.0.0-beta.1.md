# Windows beta publication verification

## Rechecked for this publication

- 30 JavaScript tests passed from the repository's beta source.
- 9 Rust tests passed with `cargo test --locked --offline --release` and existing local build tools.
- Both supplied Windows executables have file/product version `2.0.0-beta.1`; SHA256 matches the developer's manifest.
- The installer uses Tauri's NSIS current-user configuration with `downloadBootstrapper` for missing WebView2. The standalone executable assumes WebView2 is already installed.
- Only the two Windows executables and a two-entry SHA256 manifest are release assets. Source is committed separately on the beta branch.

## Supplied development verification

The release folder contains passing records for 10 WebView2 integration groups and migration/report parity, with synthetic screenshots. Those records report that legacy files were unchanged. Publication-time UI rerun was attempted with isolated synthetic data, but the already running beta's single-instance guard exited the test process before any checks ran. The running application was not stopped. The supplied UI and real-data migration checks were not independently repeated during publication, and the installer was not installed against the user's profile.

## Limits and privacy

This is a pre-release, not a stable release. Multi-monitor DPI changes, actual Explorer crashes, sleep/resume, notification delivery and continuous multi-day operation still require real-environment testing. No macOS or Linux binary was built or published. Local profiles, settings, history, tokens indexes, logs, credentials and QA profile directories are not included in the commit or release assets. GitHub branch/tag contents and remote asset SHA256 values are checked before publication.
