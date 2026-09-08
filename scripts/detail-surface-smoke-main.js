const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

app.setPath("userData", path.join(os.tmpdir(), "codex-floating-ball-detail-surface-v1-1-2"));

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function alphaAt(bitmap, width, x, y) {
  return bitmap[(y * width + x) * 4 + 3];
}

async function captureAndInspect(window, theme) {
  await window.webContents.executeJavaScript(`document.body.dataset.theme = ${JSON.stringify(theme)}`);
  await wait(100);

  const image = await window.webContents.capturePage();
  const { width, height } = image.getSize();
  const bitmap = image.toBitmap();
  const outputPath = path.join(os.tmpdir(), `codex-floating-ball-detail-${theme}.png`);
  fs.writeFileSync(outputPath, image.toPNG());

  const style = await window.webContents.executeJavaScript(`(() => {
    const panel = document.querySelector('.detail-panel');
    const computed = getComputedStyle(panel);
    return {
      backgroundColor: computed.backgroundColor,
      borderRadius: computed.borderRadius,
      overflow: computed.overflow,
      backdropFilter: computed.backdropFilter
    };
  })()`);

  return {
    outputPath,
    style,
    alpha: {
      topLeft: alphaAt(bitmap, width, 0, 0),
      topRight: alphaAt(bitmap, width, width - 1, 0),
      bottomLeft: alphaAt(bitmap, width, 0, height - 1),
      bottomRight: alphaAt(bitmap, width, width - 1, height - 1),
      center: alphaAt(bitmap, width, Math.floor(width / 2), Math.floor(height / 2)),
      topEdge: alphaAt(bitmap, width, Math.floor(width / 2), 1),
      leftEdge: alphaAt(bitmap, width, 1, Math.floor(height / 2))
    }
  };
}

app.whenReady().then(async () => {
  const diagnostics = [];
  const window = new BrowserWindow({
    width: 520,
    height: 360,
    frame: false,
    show: false,
    transparent: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "visual-smoke-preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    diagnostics.push({ level, message, line, sourceId });
  });

  await window.loadFile(path.join(__dirname, "../src/renderer/index.html"));
  await wait(400);
  const light = await captureAndInspect(window, "light");
  const dark = await captureAndInspect(window, "dark");

  process.stdout.write(`${JSON.stringify({ light, dark, diagnostics })}\n`);
  window.destroy();
  app.quit();
});
