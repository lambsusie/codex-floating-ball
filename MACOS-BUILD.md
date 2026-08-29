# macOS v1.1.1 构建说明

该目录是 Codex Floating Ball v1.1.1 的 macOS 发布源码，支持：

- Apple Silicon：`arm64`
- Intel Mac：`x64`
- 5 小时与 7 天额度历史记录和 CSV 导出
- 历史曲线可切换已用额度/剩余额度，并支持数据点悬停提示
- 智能刷新、可调悬浮球和可选的 GitHub Release 更新检查
- macOS 菜单栏托盘模式，不在 Dock 常驻

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
Codex-Floating-Ball-1.1.1-mac-arm64.dmg
Codex-Floating-Ball-1.1.1-mac-x64.dmg
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

从 v1.0.0 或 v1.1.0 升级到 v1.1.1 不会删除历史记录。macOS 数据保存在：

```text
~/Library/Application Support/codex-floating-ball/quota-history.ndjson
```

CSV 导出只读取本机历史文件，并写入用户在保存窗口中选择的位置。

## 无签名版本说明

当前构建未使用 Apple Developer 证书。首次打开时，macOS 可能阻止运行；请在 Finder 中右键应用并选择“打开”，或前往“系统设置 > 隐私与安全性”选择“仍要打开”。

## English

This package builds unsigned Codex Floating Ball v1.1.1 DMGs for Apple Silicon (`arm64`) and Intel (`x64`). It adds CSV history export, used/remaining chart modes, and hover details for chart data points. Run the **Build macOS packages** GitHub Actions workflow, or run `npm ci && npm test && npm run build:mac` on a Mac. Each workflow artifact contains a DMG and its SHA-256 checksum.
