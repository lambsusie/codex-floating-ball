const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { dateKey, dayStart, reportRange, nextSettlementStart } = require("../src/main/report-periods");
const { normalizeUsage, aggregateUsage, readUsageFile, scanUsage } = require("../src/main/token-usage");
const { getReportView, createTokenReportService } = require("../src/main/token-report-service");

const now = Date.parse("2026-10-03T00:05:00+08:00");
const usage = (input, output = 10, cached = 0, reasoning = 0) => ({ input_tokens: input, output_tokens: output,
  cached_input_tokens: cached, reasoning_output_tokens: reasoning, total_tokens: input + output });
const snapshot = (day, total, last = total, line = 1) => ({ type: "snapshot", timestamp: `2026-10-${day}T01:00:00+08:00`, total, last, line });
const entry = (events, id = "a", parent) => ({ meta: { id, parent }, events });

test("Beijing day boundaries, Monday weeks, leap months and daily settlement", () => {
  assert.equal(dateKey(Date.parse("2026-10-01T15:59:59.999Z")), "2026-10-01");
  assert.equal(dateKey(Date.parse("2026-10-01T16:00:00Z")), "2026-10-02");
  assert.equal(reportRange("week", "2026-10-02").startDate, "2026-09-28");
  assert.equal(reportRange("week", "2026-10-04").endDate, "2026-10-04");
  assert.equal(reportRange("month", "2024-02-29").endDate, "2024-02-29");
  assert.throws(() => dayStart("2026-02-30"));
  assert.throws(() => reportRange("invalid"));
  assert.equal(dateKey(nextSettlementStart(now)), "2026-10-03");
  assert.equal(nextSettlementStart(now), Date.parse("2026-10-03T23:59:59+08:00"));
});

test("input/cache and output/reasoning are inclusive, invalid data is rejected", () => {
  assert.equal(normalizeUsage(usage(100, 20, 80, 10)).total_tokens, 120);
  assert.equal(normalizeUsage(usage(100, 20, 101)), null);
  assert.equal(normalizeUsage({ ...usage(100), total_tokens: 999 }), null);
  assert.equal(normalizeUsage(usage(-1)), null);
});

test("cumulative deltas and archived duplicate snapshots count once", () => {
  const events = [snapshot("01", usage(100)), snapshot("02", usage(300, 30), usage(200, 20), 2)];
  const store = aggregateUsage({ active: entry(events), archived: entry(events) }, now);
  assert.equal(store.days["2026-10-01"].usage.total_tokens, 110);
  assert.equal(store.days["2026-10-02"].usage.total_tokens, 220);
  assert.equal(store.summaries.week["2026-09-28"].usage.total_tokens, 330);
  assert.equal(store.summaries.month["2026-10-01"].usage.total_tokens, 330);
});

test("counter resets and request-shaped cumulative records are not subtracted", () => {
  const store = aggregateUsage({ a: entry([snapshot("01", usage(100)), snapshot("02", usage(20), usage(20), 2),
    { ...snapshot("02", usage(40)), timestamp: "2026-10-02T02:00:00+08:00", line: 3 }]) }, now);
  assert.equal(store.days["2026-10-02"].usage.total_tokens, 80);
});

test("ledger, following snapshots and archived response IDs are deduplicated", () => {
  const ledger = { type: "ledger", timestamp: "2026-10-01T01:00:00+08:00", session: "a", response: "r1", usage: usage(100), line: 1 };
  const snap = { ...snapshot("01", usage(100)), line: 2 };
  const store = aggregateUsage({ a: entry([ledger, snap]), z: entry([ledger, snap]) }, now);
  assert.equal(store.days["2026-10-01"].usage.total_tokens, 110);
  assert.equal(store.invalidRecords, 0);
});

test("forked sessions exclude the parent's inherited cumulative baseline", () => {
  const store = aggregateUsage({ a: entry([snapshot("01", usage(100))]), b: entry([snapshot("02", usage(130, 15), usage(30, 5))], "b", "a") }, now);
  assert.equal(store.days["2026-10-02"].usage.total_tokens, 35);
  assert.equal(store.unknownUsage.total_tokens, 0);
});

test("duplicated ledgers do not leak pending usage into the next snapshot", () => {
  const events = [
    { type: "ledger", timestamp: "2026-10-01T01:00:00Z", session: "a", response: "r1", usage: usage(100), line: 1 },
    { ...snapshot("01", usage(100)), timestamp: "2026-10-01T01:00:00Z", line: 2 },
    { type: "ledger", timestamp: "2026-10-02T01:00:00Z", session: "a", response: "r2", usage: usage(200, 20), line: 3 },
    { ...snapshot("02", usage(300, 30), usage(200, 20)), timestamp: "2026-10-02T01:00:00Z", line: 4 }
  ];
  const report = aggregateUsage({ a: entry(events), z: entry(events) }, now);
  assert.equal(report.days["2026-10-02"].usage.total_tokens, 220);
  assert.equal(report.days["2026-10-02"].incomplete, false);
});

test("last fractional second belongs to the old day, midnight to the new day", () => {
  const ledger = (timestamp, response) => ({ type: "ledger", timestamp, response, session: "a", usage: usage(100), line: 1 });
  const report = aggregateUsage({ a: entry([
    ledger("2025-12-31T23:59:59.999+08:00", "old-year"),
    ledger("2026-01-01T00:00:00+08:00", "new-year")
  ]) }, now);
  assert.equal(report.days["2025-12-31"].usage.total_tokens, 110);
  assert.equal(report.days["2026-01-01"].usage.total_tokens, 110);
  assert.equal(report.summaries.month["2025-12-01"].usage.total_tokens, 110);
  assert.equal(report.summaries.month["2026-01-01"].usage.total_tokens, 110);
  assert.equal(report.summaries.week["2025-12-29"].usage.total_tokens, 220);
});

test("first historical baseline stays undated, not assigned to the current day", () => {
  const store = aggregateUsage({ a: entry([snapshot("02", usage(1000, 100), usage(100))]) }, now);
  assert.equal(store.days["2026-10-02"].usage.total_tokens, 110);
  assert.equal(store.unknownUsage.total_tokens, 990);
});

test("report totals exclude today and distinguish missing from pending", () => {
  const store = aggregateUsage({ a: entry([snapshot("01", usage(100)), snapshot("03", usage(500), usage(500), 2)]) }, now);
  const view = getReportView(store, { period: "month", anchor: "2026-10-03" }, now);
  assert.equal(view.totals.total_tokens, 110);
  assert.equal(view.days[1].status, "no-record");
  assert.equal(view.days[2].status, "pending");
  assert.equal(getReportView(store, { anchor: "2026-10-02" }, now).totals, null);
});

test("incremental reader completes partial lines and does not cache conversation text", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tokens-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, "log.jsonl");
  const meta = JSON.stringify({ type: "session_meta", payload: { id: "a" } }) + "\n";
  const event = JSON.stringify({ type: "event_msg", timestamp: "2026-10-01T01:00:00Z", payload: { type: "token_count", info: { total_token_usage: usage(100), last_token_usage: usage(100) } } });
  fs.writeFileSync(file, meta + '{"type":"response_item","payload":{"text":"PRIVATE TEXT"}}\n' + event.slice(0, 30));
  const first = await readUsageFile(file);
  assert.equal(first.events.length, 0);
  assert.equal(first.tailPending, true);
  fs.appendFileSync(file, event.slice(30) + "\n");
  const next = await readUsageFile(file, first);
  assert.equal(next.events.length, 1);
  assert.equal(next.tailPending, false);
  assert.ok(!JSON.stringify(next).includes("PRIVATE TEXT"));
  assert.deepEqual(await readUsageFile(file, next), next);
  fs.writeFileSync(file, meta);
  assert.equal((await readUsageFile(file, next)).events.length, 0);
});

test("restart, archived logs and late appends produce idempotent backfill", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tokens-scan-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "sessions"));
  const file = path.join(root, "sessions", "a.jsonl");
  fs.writeFileSync(file, JSON.stringify({ type: "session_meta", payload: { id: "a" } }) + "\n" +
    JSON.stringify({ type: "token_usage_record", timestamp: "2026-10-01T01:00:00Z", payload: { thread_id: "a", response_id: "r1", usage: usage(100) } }) + "\n");
  const first = await scanUsage(root, {}, now);
  fs.mkdirSync(path.join(root, "archived_sessions"));
  fs.renameSync(file, path.join(root, "archived_sessions", "a.jsonl"));
  const next = await scanUsage(root, first.cache, now);
  assert.deepEqual(next.report.days, first.report.days);
  fs.appendFileSync(path.join(root, "archived_sessions", "a.jsonl"), JSON.stringify({ type: "token_usage_record", timestamp: "2026-10-01T02:00:00Z", payload: { thread_id: "a", response_id: "r2", usage: usage(50) } }) + "\n");
  const late = await scanUsage(root, next.cache, now);
  assert.equal(late.report.days["2026-10-01"].usage.total_tokens, 170);
});

test("worker persists reports and index, and missing source stays explicitly missing", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tokens-worker-"));
  let service;
  t.after(() => { service?.stop(); fs.rmSync(root, { recursive: true, force: true }); });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Worker timeout")), 10000);
    service = createTokenReportService({ userData: root, codexHome: path.join(root, "no-codex"), onUpdated: () => {
      const view = service.getReport();
      if (!view.scanning) { clearTimeout(timeout); assert.equal(view.sourceStatus, "missing"); resolve(); }
    } });
    service.start();
  });
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, "token-reports.json"))).schemaVersion, 1);
});
