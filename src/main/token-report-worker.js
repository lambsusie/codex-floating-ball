const { parentPort, workerData } = require("node:worker_threads");
const fs = require("node:fs");
const path = require("node:path");
const { scanUsage } = require("./token-usage");

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

function atomicJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value), "utf8");
  fs.renameSync(temporary, file);
}

(async () => {
  const stored = readJson(workerData.cachePath);
  const cache = stored?.schemaVersion === 1 && stored.root === workerData.root ? stored : {};
  const result = await scanUsage(workerData.root, cache, workerData.now);
  atomicJson(workerData.cachePath, result.cache);
  atomicJson(workerData.reportPath, result.report);
  parentPort.postMessage({ ok: true, report: result.report });
})().catch((error) => {
  parentPort.postMessage({ ok: false, error: error.code || "scan_failed" });
});
