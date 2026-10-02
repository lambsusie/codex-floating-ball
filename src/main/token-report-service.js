const fs = require("node:fs");
const path = require("node:path");
const { Worker } = require("node:worker_threads");
const { DAY_MS, dateKey, dayStart, reportRange, nextSettlementStart } = require("./report-periods");
const { emptyUsage, addUsage } = require("./token-usage");

function getReportView(store, { period = "day", anchor = dateKey() } = {}, now = Date.now()) {
  const range = reportRange(period, anchor);
  const closedBefore = Math.min(store?.closedBefore || 0, dayStart(dateKey(now)));
  const days = [];
  const totals = emptyUsage();
  for (let time = range.start; time < range.end; time += DAY_MS) {
    const key = dateKey(time);
    const stored = store?.days?.[key];
    const settled = time < closedBefore;
    const value = settled ? stored : null;
    if (value) addUsage(totals, value.usage);
    days.push({ date: key, status: !settled ? "pending" : value ? "recorded" : "no-record",
      usage: value?.usage || null, incomplete: Boolean(value?.incomplete), timestampBatched: Boolean(value?.timestampBatched) });
  }
  const recordedDays = days.filter((day) => day.status === "recorded").length;
  return { period, ...range, timezone: "Asia/Shanghai", totals: recordedDays ? totals : null,
    days, recordedDays, missingDays: days.filter((day) => day.status === "no-record").length,
    pendingDays: days.filter((day) => day.status === "pending").length,
    updatedAt: store?.updatedAt || null, settledThrough: closedBefore ? dateKey(closedBefore - 1) : null,
    sourceStatus: store?.sourceStatus || "scanning", unknownTokens: store?.unknownUsage?.total_tokens || 0,
    readErrorCount: store?.readErrorCount || 0, invalidRecords: store?.invalidRecords || 0 };
}

function createTokenReportService({ userData, codexHome, onUpdated = () => {} }) {
  const reportPath = path.join(userData, "token-reports.json");
  const cachePath = path.join(userData, "token-usage-index.json");
  let store;
  try { store = JSON.parse(fs.readFileSync(reportPath, "utf8")); } catch { store = null; }
  if (store?.schemaVersion !== 1) store = null;
  let worker;
  let timer;
  let finalizer;
  let stopped = false;
  let lastError = false;
  function refresh() {
    if (worker || stopped) return;
    lastError = false;
    try {
      worker = new Worker(path.join(__dirname, "token-report-worker.js"), {
        workerData: { root: codexHome, cachePath, reportPath, now: Date.now() }
      });
    } catch {
      lastError = true;
      onUpdated();
      return;
    }
    let received = false;
    worker.on("message", (message) => {
      received = true;
      if (message.ok) store = message.report;
      else lastError = true;
    });
    worker.on("error", () => { lastError = true; });
    worker.on("exit", () => {
      worker = null;
      if (!received) lastError = true;
      onUpdated();
      if (!lastError && !stopped && store.closedBefore < dayStart(dateKey())) refresh();
    });
    onUpdated();
  }
  function schedule() {
    clearTimeout(timer);
    if (stopped) return;
    const scheduledAt = nextSettlementStart();
    timer = setTimeout(() => {
      refresh();
      // The 23:59:59 job finishes just after midnight, including the whole last second.
      finalizer = setTimeout(() => { refresh(); schedule(); }, Math.max(0, scheduledAt + 2500 - Date.now()));
    }, Math.max(0, scheduledAt - Date.now()));
  }
  return {
    refresh,
    start() { refresh(); schedule(); },
    resume() {
      if (!store || lastError || store.closedBefore < dayStart(dateKey())) refresh();
      clearTimeout(finalizer);
      schedule();
    },
    getReport(query) {
      const view = getReportView(store, query);
      return { ...view, scanning: Boolean(worker), sourceStatus: lastError ? "error" : view.sourceStatus };
    },
    stop() { stopped = true; clearTimeout(timer); clearTimeout(finalizer); if (worker) void worker.terminate(); }
  };
}

module.exports = { getReportView, createTokenReportService };
