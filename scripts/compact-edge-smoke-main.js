const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const scaleFactor = Number(process.argv.find((argument) => argument.startsWith("--scale-factor="))?.split("=")[1]) || 1;
app.commandLine.appendSwitch("force-device-scale-factor", String(scaleFactor));
app.setPath("userData", path.join(os.tmpdir(), `codex-floating-ball-edge-smoke-${scaleFactor}`));

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function analyzeAlpha(image) {
  const { width, height } = image.getSize();
  const bitmap = image.toBitmap();
  let transparent = 0;
  let partial = 0;
  let opaque = 0;

  for (let index = 3; index < bitmap.length; index += 4) {
    const alpha = bitmap[index];
    if (alpha === 0) transparent += 1;
    else if (alpha === 255) opaque += 1;
    else partial += 1;
  }

  return { width, height, transparent, partial, opaque };
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 132,
    height: 132,
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

  await window.loadFile(path.join(__dirname, "../src/renderer/index.html"));
  await wait(300);
  await window.webContents.executeJavaScript(`(() => {
    document.body.dataset.mode = 'compact';
    applyCompactAppearance({ ballSize: 120, quotaFontSize: 27, resetFontSize: 11 });
  })()`);
  await wait(300);

  const image = await window.webContents.capturePage();
  const outputPath = path.join(os.tmpdir(), `codex-floating-ball-edge-${scaleFactor}.png`);
  fs.writeFileSync(outputPath, image.toPNG());
  const alpha = analyzeAlpha(image);
  const render = await window.webContents.executeJavaScript(`(() => {
    const surface = document.querySelector('.compact-orb-surface');
    return {
      renderWidth: surface.offsetWidth,
      displayWidth: surface.getBoundingClientRect().width,
      transform: getComputedStyle(surface).transform
    };
  })()`);

  process.stdout.write(`${JSON.stringify({ scaleFactor, outputPath, alpha, render })}\n`);
  window.destroy();
  app.quit();
});
