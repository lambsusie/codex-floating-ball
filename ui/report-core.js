// Generated from the v1.2.2 pure report algorithms; no Node runtime is required.
(function () {
const DAY_MS = 86400000;

const OFFSET_MS = 8 * 3600000;

function dateKey(time = Date.now()) {
  return new Date(Number(time) + OFFSET_MS).toISOString().slice(0, 10);
}

function dayStart(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error("Invalid report date");
  const time = Date.parse(`${key}T00:00:00+08:00`);
  if (!Number.isFinite(time) || dateKey(time) !== key) throw new Error("Invalid report date");
  return time;
}

function shiftDate(key, amount) {
  return dateKey(dayStart(key) + amount * DAY_MS);
}

function reportRange(period = "day", anchor = dateKey()) {
  const startDay = dayStart(anchor);
  const date = new Date(startDay + OFFSET_MS);
  let start = startDay;
  let end = start + DAY_MS;
  if (period === "week") {
    start -= ((date.getUTCDay() + 6) % 7) * DAY_MS;
    end = start + 7 * DAY_MS;
  } else if (period === "month") {
    start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1) - OFFSET_MS;
    end = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) - OFFSET_MS;
  } else if (period !== "day") {
    throw new Error("Invalid report period");
  }
  return { start, end, startDate: dateKey(start), endDate: dateKey(end - 1) };
}

function nextSettlementStart(now = Date.now()) {
  const target = dayStart(dateKey(now)) + DAY_MS - 1000;
  return target > now ? target : target + DAY_MS;
}
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
globalThis.ReportCore = { DAY_MS, OFFSET_MS, dateKey, dayStart, shiftDate, reportRange, nextSettlementStart, FIELDS, emptyUsage, vector, same, usageFromVector, normalizeUsage, addUsage, aggregateUsage, getReportView };
})();
