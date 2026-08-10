# Codex Floating Ball

[中文](#中文说明) | [English](#english)

---

## 中文说明

一个用于查看本机 Codex 用量额度的 Windows 与 macOS 桌面悬浮组件。

> 本项目 Fork 自 [xicunwus2025-sys/codex-led-widget](https://github.com/xicunwus2025-sys/codex-led-widget)，在保留原项目 MIT 协议的基础上进行了独立的功能与界面增强。感谢原项目作者。

### 为什么做这个项目

Codex CLI 很适合日常开发，但持续查看 5 小时额度和 7 天额度并不总是方便。Codex Floating Ball 希望提供一个轻量、常驻、无需频繁切换窗口的桌面 companion tool，让用户能够更直观地了解本机 Codex 使用额度与重置时间。

本项目强调本地化和隐私友好：额度信息通过本机 Codex CLI 读取，不要求、不保存，也不会上传你的 Codex Token。

### 主要功能

- 默认以紧凑悬浮球显示 5 小时额度剩余百分比和重置时间。
- 悬浮球采用 2 倍超采样渲染与柔化透明边缘，在桌面缩放下保持更平滑的圆形轮廓。
- 单击悬浮球打开完整界面，双击立即手动刷新额度。
- 可直接拖动悬浮球到桌面任意位置，位置会自动记住。
- 完整界面失去焦点时自动返回悬浮球状态。
- 分别显示 5 小时额度和 7 天额度；两者都可独立选择显示剩余时长或具体重置时间点。
- 悬浮球可单独选择显示 5 小时额度的剩余时长或重置时间点。
- 可自定义周额度预警阈值；低于阈值时会在悬浮球旁显示告警提示。
- 支持设置自动刷新间隔，也可随时手动刷新。
- 智能刷新：可设置活跃时的刷新间隔和无额度变化超时；长期无变化会转为手动，双击悬浮球或手动刷新会恢复自动刷新。主界面下拉框可直接修改活跃刷新间隔，并与设置页同步。
- 智能模式切换为手动后，主界面下拉框会明确显示“手动”；重新选择分钟数即可恢复自动刷新。
- 设置页支持中文/English、浅色/深色模式和周额度预警阈值。
- 使用托盘图标，不会在任务栏常驻窗口图标。

### 下载与使用

请前往 [Releases](../../releases) 下载对应平台的安装包：

- Windows：`Codex-Floating-Ball-*-win-x64.exe`
- Apple 芯片 Mac：`Codex-Floating-Ball-*-mac-arm64.dmg`
- Intel 芯片 Mac：`Codex-Floating-Ball-*-mac-x64.dmg`

Windows：

1. 双击运行 `Codex-Floating-Ball-*-win-x64.exe`。
2. 等待组件读取本机 Codex 用量。
3. 拖动悬浮球放到合适的位置。
4. 单击查看详情和设置；双击立即刷新。

macOS：

1. 打开对应芯片架构的 `.dmg`，将应用拖入“应用程序”。
2. 当前构建未使用 Apple Developer 证书签名。若首次打开被 macOS 阻止，请前往“系统设置 > 隐私与安全性”，点击“仍要打开”。
3. 等待组件读取本机 Codex 用量，然后按与 Windows 版相同的方式使用。

### 运行要求

- Windows 10/11，或 macOS 12 及以上版本
- 已在本机安装并登录 Codex 桌面应用或 Codex CLI

本组件通过本机 Codex CLI 读取用量信息，不要求、不保存，也不会上传你的 Codex Token。

### 从源码构建

```powershell
npm install
npm start
```

生成便携版 Windows `.exe`：

```powershell
npm run build:win
```

在 macOS 上生成 Intel 与 Apple 芯片版 `.dmg`：

```bash
npm run build:mac
```

生成用于本机测试的解包目录：

```powershell
npm run build:dir
```

没有 Mac 时，可在 GitHub 仓库的 `Actions` 页面手动运行 `Build macOS packages`。完成后下载 `arm64` 和 `x64` 两个构建产物，解压得到 `.dmg`，再添加到对应版本的 GitHub Release。

### 参与贡献

欢迎提交 Bug、功能建议和 Pull Request。开始贡献前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

如果你发现可能涉及凭证、Token、本地文件访问或其他安全边界的问题，请不要公开披露敏感细节，先阅读 [SECURITY.md](SECURITY.md)。

---

## English

A customizable Windows and macOS desktop floating widget for monitoring the usage quota of the locally installed Codex CLI.

> This is a fork and enhanced version of [xicunwus2025-sys/codex-led-widget](https://github.com/xicunwus2025-sys/codex-led-widget). It retains the upstream project's MIT license and gives full credit to the original project.

### Why this project exists

Codex CLI is well suited to everyday development, but continuously checking the 5-hour and 7-day usage quotas is not always convenient. Codex Floating Ball provides a lightweight desktop companion that keeps quota information and reset timing visible without requiring users to repeatedly switch context.

The project is designed to be local-first and privacy-friendly. Quota information is read through the locally installed Codex CLI. The application does not ask for, store, or upload your Codex Token.

### Features

- A compact floating ball as the normal desktop state, showing the remaining 5-hour quota and its reset time.
- The floating ball uses 2x supersampled rendering and feathered transparency for smoother edges on scaled displays.
- Single-click the ball to open the detail panel; double-click it to refresh immediately.
- Drag the ball directly to any position on the desktop. The position is remembered.
- The detail panel automatically returns to compact mode when it loses focus.
- Separate 5-hour and 7-day quota views. Each can independently show either time remaining or the exact reset time.
- The floating ball can independently show either the 5-hour time remaining or its reset time.
- An adjustable weekly-quota alert threshold. A second warning ball appears when the weekly quota is low.
- Configurable automatic refresh interval, plus a manual refresh button.
- Smart refresh with configurable active interval and idle timeout. It switches to manual after quota stays unchanged, then resumes auto refresh after a manual refresh or a double-click on the ball. The main-panel interval selector edits the same active interval as the settings page.
- When smart refresh pauses, the main selector clearly shows Manual; selecting an interval resumes automatic refresh.
- Settings for Chinese/English, light/dark theme, and the weekly warning threshold.
- Tray icon support without a permanent taskbar button.

### Download and use

Download the package for your platform from [Releases](../../releases):

- Windows: `Codex-Floating-Ball-*-win-x64.exe`
- Apple silicon Mac: `Codex-Floating-Ball-*-mac-arm64.dmg`
- Intel Mac: `Codex-Floating-Ball-*-mac-x64.dmg`

Windows:

1. Run `Codex-Floating-Ball-*-win-x64.exe`.
2. Wait for the widget to read the local Codex quota.
3. Drag the floating ball to place it on the desktop.
4. Single-click the ball for details and settings, or double-click to refresh.

macOS:

1. Open the `.dmg` for your Mac architecture and drag the app into Applications.
2. This build is unsigned. If macOS blocks the first launch, open System Settings > Privacy & Security and choose Open Anyway.
3. Wait for the widget to read the local Codex quota, then use it the same way as the Windows build.

### Requirements

- Windows 10/11 or macOS 12 and later
- Codex desktop app or Codex CLI installed locally and already signed in

The widget reads quota data from the local Codex CLI. It does not ask for, save, or upload a Codex token.

### Build from source

```powershell
npm install
npm start
```

Build a portable Windows executable:

```powershell
npm run build:win
```

Build Intel and Apple silicon DMG packages on macOS:

```bash
npm run build:mac
```

Build an unpacked application directory for local testing:

```powershell
npm run build:dir
```

If you do not have a Mac, manually run `Build macOS packages` from the repository's `Actions` page. Download and unzip the `arm64` and `x64` artifacts, then attach both `.dmg` files to the matching GitHub Release.

### Contributing

Bug reports, feature requests, and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before contributing.

For vulnerabilities or issues involving credentials, tokens, local file access, or another security boundary, please avoid publishing sensitive details before reading [SECURITY.md](SECURITY.md).

---

## License and attribution

This repository is a GitHub fork of [codex-led-widget](https://github.com/xicunwus2025-sys/codex-led-widget), maintained as an independent enhanced edition. Upstream code and this fork are distributed under the MIT License; see [LICENSE](LICENSE).
