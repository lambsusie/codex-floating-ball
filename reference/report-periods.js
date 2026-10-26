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

module.exports = { DAY_MS, dateKey, dayStart, shiftDate, reportRange, nextSettlementStart };
