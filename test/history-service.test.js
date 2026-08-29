const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  appendHistory,
  createHistoryRecord,
  downsampleRecords,
  exportHistoryCsv,
  historyRecordsToCsv,
  readHistoryRange
} = require("../src/main/history-service");

test("creates a compact history record for both quota windows", () => {
  assert.deepEqual(
    createHistoryRecord({
      fetchedAt: "2026-08-27T08:00:00.000Z",
      primary: { remainingPercent: 72.5, resetsAt: "2026-08-27T10:00:00.000Z" },
      secondary: { remainingPercent: 41, resetsAt: "2026-09-01T10:00:00.000Z" }
    }),
    {
      timestamp: Date.parse("2026-08-27T08:00:00.000Z"),
      primaryRemaining: 72.5,
      secondaryRemaining: 41,
      primaryResetsAt: Date.parse("2026-08-27T10:00:00.000Z"),
      secondaryResetsAt: Date.parse("2026-09-01T10:00:00.000Z")
    }
  );
});

test("appends and queries history while ignoring malformed lines", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-history-"));
  const file = path.join(dir, "history.ndjson");
  appendHistory(file, {
    fetchedAt: "2026-08-27T08:00:00.000Z",
    primary: { remainingPercent: 90 },
    secondary: { remainingPercent: 80 }
  });
  fs.appendFileSync(file, "not-json\n", "utf8");
  appendHistory(file, {
    fetchedAt: "2026-08-28T08:00:00.000Z",
    primary: { remainingPercent: 70 },
    secondary: { remainingPercent: 60 }
  });

  const records = readHistoryRange(
    file,
    "2026-08-27T00:00:00.000Z",
    "2026-08-28T00:00:00.000Z"
  );
  assert.equal(records.length, 1);
  assert.equal(records[0].primaryRemaining, 90);
});

test("downsampling preserves first and last points", () => {
  const records = Array.from({ length: 20 }, (_, timestamp) => ({ timestamp }));
  const sampled = downsampleRecords(records, 5);
  assert.equal(sampled.length, 5);
  assert.equal(sampled[0].timestamp, 0);
  assert.equal(sampled[4].timestamp, 19);
});

test("formats remaining and used quota in CSV exports", () => {
  const csv = historyRecordsToCsv([{
    timestamp: Date.parse("2026-08-27T08:00:00.000Z"),
    primaryRemaining: 72.5,
    secondaryRemaining: 41,
    primaryResetsAt: Date.parse("2026-08-27T10:00:00.000Z"),
    secondaryResetsAt: null
  }]);
  assert.match(csv, /five_hour_remaining_percent,five_hour_used_percent/);
  assert.match(csv, /2026-08-27T08:00:00\.000Z,.*72\.5,27\.5/);
  assert.match(csv, /41,59,/);
});

test("exports every valid history record with an Excel-compatible BOM", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-history-export-"));
  const historyFile = path.join(dir, "history.ndjson");
  const outputFile = path.join(dir, "quota.csv");
  appendHistory(historyFile, {
    fetchedAt: "2026-08-27T08:00:00.000Z",
    primary: { remainingPercent: 90 },
    secondary: { remainingPercent: 80 }
  });
  fs.appendFileSync(historyFile, "partial-json\n", "utf8");
  appendHistory(historyFile, {
    fetchedAt: "2026-08-28T08:00:00.000Z",
    primary: { remainingPercent: 70 },
    secondary: { remainingPercent: 60 }
  });

  const result = exportHistoryCsv(historyFile, outputFile);
  const output = fs.readFileSync(outputFile, "utf8");
  assert.equal(result.recordCount, 2);
  assert.equal(output.charCodeAt(0), 0xfeff);
  assert.equal(output.trim().split(/\r?\n/).length, 3);
});
