const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

app.setPath("userData", path.join(os.tmpdir(), "codex-floating-ball-visual-smoke-v1-1-2"));

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function capture(window, name) {
  const image = await window.webContents.capturePage();
  const outputPath = path.join(os.tmpdir(), `codex-floating-ball-${name}.png`);
  fs.writeFileSync(outputPath, image.toPNG());
  return outputPath;
}

app.whenReady().then(async () => {
  const diagnostics = [];
  const window = new BrowserWindow({
    width: 520,
    height: 360,
    frame: false,
    show: false,
    transparent: false,
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "visual-smoke-preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    diagnostics.push({ level, message, line, sourceId });
  });
  window.webContents.on("render-process-gone", (_event, details) => {
    diagnostics.push({ rendererGone: details });
  });

  await window.loadFile(path.join(__dirname, "../src/renderer/index.html"));
  await wait(500);
  const startupMetrics = await window.webContents.executeJavaScript(`({
    mode: document.body.dataset.mode,
    view: document.body.dataset.view,
    hasBridge: Boolean(window.codexQuota),
    hasHistoryUtils: Boolean(window.historyUtils),
    hasSmartUtils: Boolean(window.smartRefreshUtils)
  })`);
  const main = await capture(window, "main");

  await window.webContents.executeJavaScript("document.getElementById('settingsBtn').click()");
  await wait(200);
  const settings = await capture(window, "settings");
  const settingsMetrics = await window.webContents.executeJavaScript(`(() => {
    const scroll = document.querySelector('.settings-scroll');
    const ranges = [...document.querySelectorAll('.settings-range-row')];
    return {
      clientHeight: scroll.clientHeight,
      scrollHeight: scroll.scrollHeight,
      rangeRows: ranges.length,
      rangesInsideScroll: ranges.every((row) => scroll.contains(row))
    };
  })()`);

  await window.webContents.executeJavaScript("document.getElementById('checkUpdateBtn').click()");
  await wait(200);
  await window.webContents.executeJavaScript("document.querySelector('.settings-scroll').scrollTop = 130");
  await wait(100);
  const settingsUpdate = await capture(window, "settings-update");
  const updateMetrics = await window.webContents.executeJavaScript(`({
    autoCheckEnabled: document.getElementById('autoUpdateToggle').checked,
    status: document.getElementById('updateStatusText').textContent,
    action: document.getElementById('checkUpdateBtn').textContent,
    settingsHasUpdateDot: document.getElementById('settingsBtn').classList.contains('has-update'),
    settingsScrollTop: document.querySelector('.settings-scroll').scrollTop
  })`);
  const updateDisabledMetrics = await window.webContents.executeJavaScript(`(() => {
    const toggle = document.getElementById('autoUpdateToggle');
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
    return {
      storedValue: localStorage.getItem('codex-led-auto-check-updates'),
      timerActive: Boolean(state.updateCheckTimer)
    };
  })()`);

  await window.webContents.executeJavaScript(`(async () => {
    const toggle = document.getElementById('smartEnabledToggle');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 100));
    const idleSelect = document.getElementById('smartIdleRefreshSelect');
    idleSelect.value = '30';
    idleSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await enterSmartIdleMode();
    const scroll = document.querySelector('.settings-scroll');
    scroll.scrollTop = scroll.scrollHeight;
  })()`);
  await wait(200);
  const settingsSmart = await capture(window, "settings-smart");
  const smartMetrics = await window.webContents.executeJavaScript(`({
    idleRefreshValue: document.getElementById('smartIdleRefreshSelect').value,
    mainRefreshValue: document.getElementById('autoRefreshSelect').value,
    status: document.getElementById('smartStatusText').textContent,
    idleControlVisible: !document.getElementById('smartIdleRefreshSelect').closest('.settings-row').hidden
  })`);

  await window.webContents.executeJavaScript("document.getElementById('historyBtn').click()");
  await wait(300);
  const history = await capture(window, "history");
  const historyMetrics = await window.webContents.executeJavaScript(`(() => {
    const panel = document.getElementById('historyPanel').getBoundingClientRect();
    const chart = document.getElementById('historyChart').getBoundingClientRect();
    const detail = document.querySelector('.detail-panel').getBoundingClientRect();
    return {
      pointCount: document.getElementById('historyPointCount').textContent,
      panelBottom: Math.round(panel.bottom),
      chartWidth: Math.round(chart.width),
      chartHeight: Math.round(chart.height),
      fitsPanel: panel.bottom <= detail.bottom,
      periodOrder: [...document.querySelectorAll('[data-period]')].map((button) => button.dataset.period),
      tickCounts: Object.fromEntries(['cycle', 'day', 'week', 'month'].map((period) => [
        period,
        historyUtils.getAxisTickValues(period, historyUtils.getPeriodRange(period, new Date())).length
      ]))
    };
  })()`);

  await window.webContents.executeJavaScript(`(() => {
    const select = document.getElementById('historyMetricSelect');
    select.value = 'remaining';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await wait(150);
  const historyRemaining = await capture(window, "history-remaining");
  await window.webContents.executeJavaScript(`(() => {
    const canvas = document.getElementById('historyChart');
    const point = state.historyChartPoints[Math.floor(state.historyChartPoints.length / 2)];
    const rect = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new MouseEvent('mousemove', {
      bubbles: true,
      clientX: rect.left + point.x,
      clientY: rect.top + (point.primaryY ?? point.secondaryY)
    }));
  })()`);
  await wait(100);
  const historyTooltip = await capture(window, "history-tooltip");
  const historyInteractionMetrics = await window.webContents.executeJavaScript(`({
    metric: document.getElementById('historyMetricSelect').value,
    primaryLegend: document.getElementById('historyPrimaryLegend').textContent,
    secondaryLegend: document.getElementById('historySecondaryLegend').textContent,
    tooltipVisible: !document.getElementById('historyTooltip').hidden,
    tooltipTime: document.getElementById('historyTooltipTime').textContent,
    tooltipPrimary: document.getElementById('historyTooltipPrimary').textContent,
    tooltipSecondary: document.getElementById('historyTooltipSecondary').textContent
  })`);
  await window.webContents.executeJavaScript(`(() => {
    hideHistoryTooltip();
    const select = document.getElementById('historyMetricSelect');
    select.value = 'used';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('historyExportBtn').click();
  })()`);
  await wait(100);
  const exportStatus = await window.webContents.executeJavaScript("document.getElementById('historyPointCount').textContent");
  const historyExport = await capture(window, "history-export");

  const compactMetrics = await window.webContents.executeJavaScript(`(() => {
    document.body.dataset.mode = 'compact';
    applyCompactAppearance({ ballSize: 200, quotaFontSize: 63, resetFontSize: 24 });
    const quota = document.getElementById('compactRemaining').getBoundingClientRect();
    const reset = document.getElementById('compactReset').getBoundingClientRect();
    const orb = document.querySelector('.compact-orb').getBoundingClientRect();
    const surface = document.querySelector('.compact-orb-surface');
    const surfaceBounds = surface.getBoundingClientRect();
    return {
      quotaBottom: Math.round(quota.bottom),
      resetTop: Math.round(reset.top),
      noTextOverlap: quota.bottom <= reset.top,
      textInsideOrb: quota.top >= orb.top && reset.bottom <= orb.bottom,
      renderWidth: surface.offsetWidth,
      displayWidth: Math.round(surfaceBounds.width),
      supersampleFactor: surface.offsetWidth / surfaceBounds.width,
      transform: getComputedStyle(surface).transform
    };
  })()`);
  await window.setSize(212, 212);
  await wait(200);
  const compact = await capture(window, "compact-max");

  process.stdout.write(`${JSON.stringify({ main, settings, settingsUpdate, settingsSmart, history, historyRemaining, historyTooltip, historyExport, compact, startupMetrics, settingsMetrics, updateMetrics, updateDisabledMetrics, smartMetrics, historyMetrics, historyInteractionMetrics, exportStatus, compactMetrics, diagnostics })}\n`);
  window.destroy();
  app.quit();
});
