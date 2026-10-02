# macOS v1.2.0 构建说明

该目录是 Codex Floating Ball v1.2.0 的 macOS 发布源码，支持：

- Apple Silicon：`arm64`
- Intel Mac：`x64`
- 浅色、深色和跟随系统外观，并在系统主题变化时即时切换
- 原生动态材质与液态玻璃风格；开启“降低透明度”时自动回退到不透明界面
- 自动适配 Pro 用户或官方临时取消 5 小时限制的仅周额度模式
- 5 小时与 7 天额度历史记录和 CSV 导出
- 历史曲线可切换已用额度/剩余额度，并支持数据点悬停提示
- 智能刷新、可调悬浮球和可选的 GitHub Release 更新检查
- macOS 菜单栏托盘模式，不在 Dock 常驻
- 本机 tokens 日/周/月报告、后台定时统计、历史回溯和启动/唤醒补算
- 历史曲线横轴滚轮缩放与同方向、等距离的左键拖动；右键无操作。无需先放大，可跨日期加载记录，纵轴保持 0–100%
- 新的规整缺口环图标与 macOS 单色模板图标

本目录是构建源码，不是已经生成的 DMG；本次在 Windows 上完成开发，macOS 安装包需由下面的 GitHub Actions 或 Mac 本机生成，尚未做 Mac 实机验证。

## 推荐：使用 GitHub Actions 构建

1. 将本目录中的源码文件上传到 GitHub 仓库 `main` 分支。
2. 打开仓库的 **Actions** 页面。
3. 选择 **Build macOS packages**。
4. 点击 **Run workflow**，选择 `main` 后开始构建。
5. 两个任务完成后下载：
   - `Codex-Floating-Ball-mac-arm64`
   - `Codex-Floating-Ball-mac-x64`
6. 解压后会得到对应架构的 `.dmg` 和 `.dmg.sha256` 文件。

生成的文件名为：

```text
Codex-Floating-Ball-1.2.0-mac-arm64.dmg
Codex-Floating-Ball-1.2.0-mac-x64.dmg
```

## 在 Mac 本机构建

```bash
npm ci
npm test
npm run build:mac
```

也可以只构建一个架构：

```bash
npm run build:mac:arm64
npm run build:mac:x64
```

## 升级与本地数据

从旧版本升级到 v1.2.0 不会删除设置或历史记录。macOS 数据保存在：

```text
~/Library/Application Support/codex-floating-ball/quota-history.ndjson
```

CSV 导出只读取本机历史文件，并写入用户在保存窗口中选择的位置。

同一目录新增 `token-reports.json` 与 `token-usage-index.json`。报告按北京时间日结，不上传本机用量或对话正文；当天未结束时显示待结算，周/月显示最近已结算日的累计量。

## 无签名版本说明

当前构建未使用 Apple Developer 证书。首次打开时，macOS 可能阻止运行；请在 Finder 中右键应用并选择“打开”，或前往“系统设置 > 隐私与安全性”选择“仍要打开”。

## English

This source package builds unsigned Codex Floating Ball v1.2.0 DMGs for Apple Silicon (`arm64`) and Intel (`x64`). It adds local-token day/week/month reports, chart zoom/pan, and new tray icons while retaining the previous system theme, macOS material, and weekly-only quota support. Run the **Build macOS packages** GitHub Actions workflow, or run `npm ci && npm test && npm run build:mac` on a Mac. Each workflow artifact contains a DMG and its SHA-256 checksum. DMGs have not been built or hardware-tested on this Windows host.
