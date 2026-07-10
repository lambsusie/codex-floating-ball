# Codex Floating Ball

A customizable Windows desktop floating widget for monitoring the usage quota of the locally installed Codex CLI.

> This is a fork and enhanced version of [xicunwus2025-sys/codex-led-widget](https://github.com/xicunwus2025-sys/codex-led-widget). It retains the upstream project's MIT license and gives full credit to the original project.

## What this fork adds

- A compact floating ball as the normal desktop state, showing the remaining 5-hour quota and its reset time.
- Single-click the ball to open the detail panel; double-click it to refresh immediately.
- Drag the ball directly to any position on the desktop. The position is remembered.
- The detail panel automatically returns to compact mode when it loses focus.
- Separate 5-hour and 7-day quota views, with the 7-day reset time shown in days and hours.
- An adjustable weekly-quota alert threshold. A second warning ball appears when the weekly quota is low.
- Configurable automatic refresh interval, plus a manual refresh button.
- Settings page for Chinese/English, light/dark theme, and the weekly warning threshold.
- Tray icon support without a permanent taskbar button.

## Requirements

- Windows 10 or Windows 11
- Codex CLI installed locally and already signed in
- Node.js 18 or later only when building from source

The widget reads quota data from the local Codex CLI. It does not ask for, save, or upload a Codex token.

## Usage

1. Start `Codex Floating Ball.exe`.
2. Wait for the quota reading to finish.
3. Drag the floating ball to place it on the desktop.
4. Single-click the ball for details and settings, or double-click to refresh data.

## Build from source

```powershell
npm install
npm start
```

Build a portable Windows executable:

```powershell
npm run build
```

Build an unpacked application directory for local testing:

```powershell
npm run build:dir
```

## Project relationship

This repository is a GitHub fork of [codex-led-widget](https://github.com/xicunwus2025-sys/codex-led-widget), maintained as an independent enhanced edition. Upstream code and this fork are distributed under the MIT License; see [LICENSE](LICENSE).

## License

MIT License. See [LICENSE](LICENSE).
