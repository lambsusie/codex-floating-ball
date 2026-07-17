# Codex Floating Ball

[中文](#中文说明) | [English](#english)

---

## 中文说明

一个用于查看本机 Codex 用量额度的 Windows 桌面悬浮组件。

> 本项目 Fork 自 [xicunwus2025-sys/codex-led-widget](https://github.com/xicunwus2025-sys/codex-led-widget)，在保留原项目 MIT 协议的基础上进行了独立的功能与界面增强。感谢原项目作者。

### 主要功能

- 默认以紧凑悬浮球显示 5 小时额度剩余百分比和重置时间。
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

请前往 [Releases](../../releases) 下载最新的 Windows `.exe` 文件。

1. 双击运行 `Codex-Floating-Ball-*-win-x64.exe`。
2. 等待组件读取本机 Codex 用量。
3. 拖动悬浮球放到合适的位置。
4. 单击查看详情和设置；双击立即刷新。

### 运行要求

- Windows 10 或 Windows 11
- 已在本机安装并登录 Codex CLI

本组件通过本机 Codex CLI 读取用量信息，不要求、不保存，也不会上传你的 Codex Token。

### 从源码构建

```powershell
npm install
npm start
```

生成便携版 Windows `.exe`：

```powershell
npm run build
```

生成用于本机测试的解包目录：

```powershell
npm run build:dir
```

---

## English

A customizable Windows desktop floating widget for monitoring the usage quota of the locally installed Codex CLI.

> This is a fork and enhanced version of [xicunwus2025-sys/codex-led-widget](https://github.com/xicunwus2025-sys/codex-led-widget). It retains the upstream project's MIT license and gives full credit to the original project.

### Features

- A compact floating ball as the normal desktop state, showing the remaining 5-hour quota and its reset time.
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

Download the latest Windows `.exe` from [Releases](../../releases).

1. Run `Codex-Floating-Ball-*-win-x64.exe`.
2. Wait for the widget to read the local Codex quota.
3. Drag the floating ball to place it on the desktop.
4. Single-click the ball for details and settings, or double-click to refresh.

### Requirements

- Windows 10 or Windows 11
- Codex CLI installed locally and already signed in

The widget reads quota data from the local Codex CLI. It does not ask for, save, or upload a Codex token.

### Build from source

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

---

## License and attribution

This repository is a GitHub fork of [codex-led-widget](https://github.com/xicunwus2025-sys/codex-led-widget), maintained as an independent enhanced edition. Upstream code and this fork are distributed under the MIT License; see [LICENSE](LICENSE).
