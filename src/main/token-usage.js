const fs = require("node:fs");
const path = require("node:path");
const { dateKey, dayStart, reportRange } = require("./report-periods");

const FIELDS = ["input_tokens", "cached_input_tokens", "cache_write_input_tokens", "output_tokens", "reasoning_output_tokens", "total_tokens"];
const emptyUsage = () => Object.fromEntries(FIELDS.map((field) => [field, 0]));
const vector = (value) => FIELDS.map((field) => value?.[field] ?? 0);
const same = (a, b) => a.every((value, index) => value === b[index]);
const usageFromVector = (value) => Object.fromEntries(FIELDS.map((field, index) => [field, value[index]]));

function normalizeUsage(value) {
  if (!value || typeof value !== "object") return null;
  const usage = emptyUsage();
  for (const field of FIELDS) {
    const number = value[field] ?? 0;
    if (!Number.isSafeInteger(number) || number < 0) return null;
    usage[field] = number;
  }
  usage.total_tokens = value.total_tokens ?? usage.input_tokens + usage.output_tokens;
  if (usage.total_tokens !== usage.input_tokens + usage.output_tokens
      || usage.cached_input_tokens > usage.input_tokens
      || usage.reasoning_output_tokens > usage.output_tokens) return null;
  return usage;
}

function addUsage(target, value) {
  for (const field of FIELDS) target[field] += value[field] || 0;
}

async function listLogFiles(root) {
  const files = [];
  const errors = [];
  let foundDirectory = false;
  async function visit(directory) {
    let entries;
    try {
      entries = await fs.promises.readdir(directory, { withFileTypes: true });
      foundDirectory = true;
    } catch (error) {
      if (error.code !== "ENOENT") errors.push({ code: error.code || "read", file: directory });
      return;
    }
    for (const entry of entries) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile() && entry.name.endsWith(".jsonl")) files.push(file);
    }
  }
  await visit(path.join(root, "sessions"));
  await visit(path.join(root, "archived_sessions"));
  return { files: files.sort(), errors, foundDirectory };
}

async function readUsageFile(file, previous) {
  const stat = await fs.promises.stat(file);
  const reusable = previous && stat.size >= previous.offset && stat.ino === previous.ino
    && !(stat.size === previous.size && stat.mtimeMs !== previous.mtimeMs);
  const data = reusable ? structuredClone(previous) : { offset: 0, events: [], meta: {}, invalid: 0, line: 0 };
  if (reusable && stat.size === previous.size && stat.mtimeMs === previous.mtimeMs) return data;
  let pending = Buffer.alloc(0);
  let completeOffset = data.offset;
  if (stat.size > data.offset) {
    const stream = fs.createReadStream(file, { start: data.offset, end: stat.size - 1 });
    for await (const chunk of stream) {
      pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
      let cursor = 0;
      let newline;
      while ((newline = pending.indexOf(10, cursor)) !== -1) {
        const bytes = pending.subarray(cursor, newline);
        completeOffset += newline - cursor + 1;
        cursor = newline + 1;
        data.line += 1;
        // Only retain usage metadata. Conversation text is never written to the index.
        const prefix = bytes.subarray(0, 512).toString("utf8");
        if (!/"(?:session_meta|token_count|token_usage_record)"/.test(prefix)) continue;
        try {
          const obj = JSON.parse(bytes.toString("utf8"));
          const payload = obj.payload || {};
          if (obj.type === "session_meta") {
            data.meta = { id: payload.id, parent: payload.forked_from_id || payload.parent_thread_id };
          } else if (obj.type === "token_usage_record") {
            data.events.push({ type: "ledger", timestamp: obj.timestamp, line: data.line,
              session: payload.thread_id, response: payload.response_id, usage: payload.usage });
          } else if (obj.type === "event_msg" && payload.type === "token_count" && payload.info) {
            data.events.push({ type: "snapshot", timestamp: obj.timestamp, line: data.line,
              total: payload.info.total_token_usage, last: payload.info.last_token_usage });
          }
        } catch {
          data.invalid += 1;
        }
      }
      pending = pending.subarray(cursor);
    }
  }
  // Do not consume an unfinished line; a later append completes it.
  data.offset = completeOffset;
  data.size = stat.size;
  data.mtimeMs = stat.mtimeMs;
  data.ino = stat.ino;
  data.tailPending = pending.length > 0;
  return data;
}

function aggregateUsage(fileEntries, now = Date.now()) {
  const sessions = new Map();
  const snapshotsBySession = new Map();
  const parents = new Map();
  const batchDays = new Set();
  let invalidRecords = 0;
  for (const [file, entry] of Object.entries(fileEntries).sort(([a], [b]) => a.localeCompare(b))) {
    invalidRecords += entry.invalid || 0;
    const uniqueTimes = new Set();
    if (entry.meta?.id && entry.meta.parent) parents.set(entry.meta.id, entry.meta.parent);
    for (const raw of entry.events || []) {
      const time = Date.parse(raw.timestamp);
      if (!Number.isFinite(time)) { invalidRecords += 1; continue; }
      if (time > now) continue;
      const sid = raw.session || entry.meta?.id;
      if (!sid) { invalidRecords += 1; continue; }
      uniqueTimes.add(time);
      const event = { ...raw, time, file, sid };
      if (!sessions.has(sid)) sessions.set(sid, []);
      sessions.get(sid).push(event);
      if (raw.type === "snapshot") {
        if (!snapshotsBySession.has(sid)) snapshotsBySession.set(sid, []);
        snapshotsBySession.get(sid).push(event);
      }
    }
    if ((entry.events?.length || 0) > 1 && uniqueTimes.size === 1) batchDays.add(dateKey([...uniqueTimes][0]));
  }
  const days = {};
  const sessionDays = new Map();
  const ledgerSeen = new Map();
  const snapshotSeen = new Set();
  const unknownUsage = emptyUsage();
  const problemDays = new Set();
  function emit(event, usage) {
    if (!usage || !usage.total_tokens) return;
    const key = dateKey(event.time);
    if (!days[key]) days[key] = { date: key, usage: emptyUsage(), events: 0, sessions: 0 };
    addUsage(days[key].usage, usage);
    days[key].events += 1;
    if (!sessionDays.has(key)) sessionDays.set(key, new Set());
    sessionDays.get(key).add(event.sid);
  }
  function valid(value, event) {
    const normalized = normalizeUsage(value);
    if (!normalized) { invalidRecords += 1; problemDays.add(dateKey(event.time)); }
    return normalized;
  }
  for (const [sid, events] of [...sessions].sort(([a], [b]) => a.localeCompare(b))) {
    events.sort((a, b) => a.time - b.time || a.file.localeCompare(b.file) || a.line - b.line);
    let previous = null;
    let pending = [];
    const sessionLedgerSeen = new Set();
    for (const event of events) {
      if (event.type === "ledger") {
        const usage = valid(event.usage, event);
        if (!usage) continue;
        const id = event.response || `${sid}:${event.timestamp}:${JSON.stringify(usage)}`;
        if (!ledgerSeen.has(id)) {
          ledgerSeen.set(id, vector(usage));
          emit(event, usage);
        } else if (!same(ledgerSeen.get(id), vector(usage))) {
          problemDays.add(dateKey(event.time));
        }
        if (!sessionLedgerSeen.has(id)) {
          pending.push(usage);
          sessionLedgerSeen.add(id);
        }
        continue;
      }
      const total = valid(event.total, event);
      if (!total) continue;
      const last = normalizeUsage(event.last);
      const tv = vector(total);
      const lv = vector(last);
      const id = `${sid}:${event.timestamp}:${tv.join(",")}:${lv.join(",")}`;
      if (snapshotSeen.has(id)) continue;
      snapshotSeen.add(id);
      if (previous && same(tv, previous)) { pending = []; continue; }
      if (pending.length) {
        // Request ledger entries already contain the usage represented by this snapshot.
        const sum = emptyUsage();
        pending.forEach((value) => addUsage(sum, value));
        const delta = tv.map((v, i) => v - (previous?.[i] || 0));
        if (!same(delta, vector(sum)) && !(last && same(lv, vector(sum)))) problemDays.add(dateKey(event.time));
        pending = [];
        previous = tv;
        continue;
      }
      if (!previous) {
        if (total.total_tokens > (last?.total_tokens || 0)) {
          const candidates = (snapshotsBySession.get(parents.get(sid)) || []).filter((x) => x.time <= event.time);
          const baseline = tv.map((v, i) => v - lv[i]);
          const inherited = candidates.some((x) => same(vector(x.total), tv));
          const inheritedPlusLast = last && candidates.some((x) => same(vector(x.total), baseline));
          if (inheritedPlusLast && !inherited) emit(event, last);
          else if (!inherited) {
            const unknown = normalizeUsage(usageFromVector(baseline));
            addUsage(unknownUsage, unknown || total);
            if (unknown && last) emit(event, last);
          }
        } else emit(event, total);
        previous = tv;
        continue;
      }
      const delta = tv.map((v, i) => v - previous[i]);
      const deltaUsage = normalizeUsage(usageFromVector(delta));
      if (last && same(tv, lv) && last.total_tokens > 0) emit(event, last);
      else if (deltaUsage && deltaUsage.total_tokens > 0) emit(event, deltaUsage);
      else if (tv[5] < previous[5] && last) emit(event, last);
      else if (delta[5] > 0 && last && last.total_tokens === delta[5]) emit(event, last);
      else if (delta[5] !== 0) problemDays.add(dateKey(event.time));
      previous = tv;
    }
  }
  for (const [key, day] of Object.entries(days)) {
    day.sessions = sessionDays.get(key).size;
    day.timestampBatched = batchDays.has(key);
    day.incomplete = problemDays.has(key);
  }
  const closedBefore = dayStart(dateKey(now));
  const summaries = { week: {}, month: {} };
  for (const day of Object.values(days)) {
    if (dayStart(day.date) >= closedBefore) continue;
    for (const period of ["week", "month"]) {
      const range = reportRange(period, day.date);
      const item = summaries[period][range.startDate] ||= { ...range, usage: emptyUsage(), recordedDays: 0, complete: range.end <= closedBefore };
      addUsage(item.usage, day.usage);
      item.recordedDays += 1;
    }
  }
  return { schemaVersion: 1, timezone: "Asia/Shanghai", updatedAt: now,
    closedBefore, days, summaries, unknownUsage, invalidRecords };
}

async function scanUsage(root, cache = {}, now = Date.now()) {
  const listed = await listLogFiles(root);
  const entries = { ...(cache.entries || {}) };
  const errors = [...listed.errors];
  for (const file of listed.files) {
    const key = path.relative(root, file);
    try { entries[key] = await readUsageFile(file, entries[key]); }
    catch (error) { errors.push({ code: error.code || "read", file: key }); }
  }
  const report = aggregateUsage(entries, now);
  report.sourceStatus = errors.length ? "partial" : (Object.keys(entries).length ? "ready" : "missing");
  report.readErrorCount = errors.length;
  report.fileCount = listed.files.length;
  return { cache: { schemaVersion: 1, root, entries }, report };
}

module.exports = { FIELDS, emptyUsage, normalizeUsage, addUsage, readUsageFile, aggregateUsage, scanUsage };
