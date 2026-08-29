const fs = require("node:fs");
const path = require("node:path");

const MAX_QUERY_DAYS = 370;
const MAX_RETURNED_POINTS = 2400;

function createHistoryRecord(quota, now = Date.now()) {
  const timestamp = parseTimestamp(quota?.fetchedAt) ?? now;
  return {
    timestamp,
    primaryRemaining: normalizeOptionalPercent(quota?.primary?.remainingPercent ?? quota?.remainingPercent),
    secondaryRemaining: normalizeOptionalPercent(quota?.secondary?.remainingPercent),
    primaryResetsAt: parseTimestamp(quota?.primary?.resetsAt),
    secondaryResetsAt: parseTimestamp(quota?.secondary?.resetsAt)
  };
}

function appendHistory(filePath, quota, now = Date.now()) {
  const record = createHistoryRecord(quota, now);
  if (record.primaryRemaining === null && record.secondaryRemaining === null) return null;

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

function readHistoryRange(filePath, start, end, maxPoints = MAX_RETURNED_POINTS) {
  const startTime = parseTimestamp(start);
  const endTime = parseTimestamp(end);
  if (startTime === null || endTime === null || endTime <= startTime) {
    throw new Error("Invalid history range.");
  }
  if (endTime - startTime > MAX_QUERY_DAYS * 86400000) {
    throw new Error(`History range cannot exceed ${MAX_QUERY_DAYS} days.`);
  }

  const records = readAllHistory(filePath).filter((record) => (
    record.timestamp >= startTime && record.timestamp < endTime
  ));
  return downsampleRecords(records, maxPoints);
}

function readAllHistory(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const records = [];
  for (const line of content.split(/\r?\n/)) {
    if (!line) continue;
    try {
      const record = JSON.parse(line);
      const timestamp = parseTimestamp(record.timestamp);
      if (timestamp === null) continue;
      records.push({
        timestamp,
        primaryRemaining: normalizeOptionalPercent(record.primaryRemaining),
        secondaryRemaining: normalizeOptionalPercent(record.secondaryRemaining),
        primaryResetsAt: parseTimestamp(record.primaryResetsAt),
        secondaryResetsAt: parseTimestamp(record.secondaryResetsAt)
      });
    } catch {
      // A partially written line should not hide the rest of the usable history.
    }
  }

  records.sort((a, b) => a.timestamp - b.timestamp);
  return records;
}

function historyRecordsToCsv(records) {
  const header = [
    "timestamp_iso",
    "timestamp_unix_ms",
    "five_hour_remaining_percent",
    "five_hour_used_percent",
    "five_hour_resets_at",
    "seven_day_remaining_percent",
    "seven_day_used_percent",
    "seven_day_resets_at"
  ];
  const rows = records.map((record) => [
    toIsoTimestamp(record.timestamp),
    record.timestamp,
    formatCsvPercent(record.primaryRemaining),
    formatCsvPercent(remainingToUsed(record.primaryRemaining)),
    toIsoTimestamp(record.primaryResetsAt),
    formatCsvPercent(record.secondaryRemaining),
    formatCsvPercent(remainingToUsed(record.secondaryRemaining)),
    toIsoTimestamp(record.secondaryResetsAt)
  ]);
  return [header, ...rows].map((row) => row.join(",")).join("\r\n") + "\r\n";
}

function exportHistoryCsv(historyPath, outputPath) {
  const records = readAllHistory(historyPath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `\uFEFF${historyRecordsToCsv(records)}`, "utf8");
  return { filePath: outputPath, recordCount: records.length };
}

function downsampleRecords(records, maxPoints) {
  const limit = Math.max(2, Math.floor(Number(maxPoints) || MAX_RETURNED_POINTS));
  if (records.length <= limit) return records;

  const result = [records[0]];
  const step = (records.length - 1) / (limit - 1);
  for (let index = 1; index < limit - 1; index += 1) {
    result.push(records[Math.round(index * step)]);
  }
  result.push(records[records.length - 1]);
  return result;
}

function normalizeOptionalPercent(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(100, Math.round(number * 100) / 100));
}

function remainingToUsed(value) {
  const remaining = normalizeOptionalPercent(value);
  return remaining === null ? null : normalizeOptionalPercent(100 - remaining);
}

function formatCsvPercent(value) {
  const normalized = normalizeOptionalPercent(value);
  return normalized === null ? "" : String(normalized);
}

function toIsoTimestamp(value) {
  const timestamp = parseTimestamp(value);
  return timestamp === null ? "" : new Date(timestamp).toISOString();
}

function parseTimestamp(value) {
  if (value === null || value === undefined || value === "") return null;
  const timestamp = typeof value === "number" ? value : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

module.exports = {
  MAX_RETURNED_POINTS,
  appendHistory,
  createHistoryRecord,
  downsampleRecords,
  exportHistoryCsv,
  historyRecordsToCsv,
  readAllHistory,
  readHistoryRange
};
