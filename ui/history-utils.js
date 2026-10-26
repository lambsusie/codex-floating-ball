(function exposeHistoryUtils(globalObject) {
  const PERIODS = new Set(["day", "week", "month", "cycle"]);

  function getPeriodRange(mode, anchorValue) {
    const period = PERIODS.has(mode) ? mode : "day";
    const anchor = validDate(anchorValue) || new Date();
    let start;
    let end;

    if (period === "cycle") {
      end = new Date(anchor);
      start = new Date(end.getTime() - 5 * 3600000);
    } else if (period === "month") {
      start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
    } else if (period === "week") {
      start = startOfLocalDay(anchor);
      const mondayOffset = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - mondayOffset);
      end = new Date(start);
      end.setDate(end.getDate() + 7);
    } else {
      start = startOfLocalDay(anchor);
      end = new Date(start);
      end.setDate(end.getDate() + 1);
    }

    return { start: start.getTime(), end: end.getTime() };
  }

  function shiftPeriod(mode, anchorValue, direction) {
    const period = PERIODS.has(mode) ? mode : "day";
    const anchor = validDate(anchorValue) || new Date();
    const amount = direction < 0 ? -1 : 1;
    if (period === "cycle") return new Date(anchor.getTime() + amount * 5 * 3600000);

    const next = new Date(anchor);
    if (period === "month") {
      next.setDate(1);
      next.setMonth(next.getMonth() + amount);
    } else {
      next.setDate(next.getDate() + amount * (period === "week" ? 7 : 1));
    }
    return next;
  }

  function buildConsumptionSeries(records) {
    return buildQuotaSeries(records, "used").map((point) => ({
      timestamp: point.timestamp,
      primaryUsed: point.primaryValue,
      secondaryUsed: point.secondaryValue
    }));
  }

  function buildQuotaSeries(records, metric = "used") {
    const showRemaining = metric === "remaining";
    return records.map((record) => ({
      timestamp: Number(record.timestamp),
      primaryValue: showRemaining ? normalizePercent(record.primaryRemaining) : remainingToUsed(record.primaryRemaining),
      secondaryValue: showRemaining ? normalizePercent(record.secondaryRemaining) : remainingToUsed(record.secondaryRemaining)
    })).filter((point) => Number.isFinite(point.timestamp));
  }

  const MINUTE = 60000;
  const DAY = 86400000;
  const TIME_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 180, 360, 720, 1440, 2880, 4320, 7200, 10080];

  function getTimeAxis(range, width, language = "zh", measureText = (text) => text.length * 6) {
    const span = range.end - range.start;
    if (!Number.isFinite(span) || span <= 0 || width <= 0) return { ticks: [], intervalMs: MINUTE };
    const minuteOnly = span <= 10 * MINUTE;
    const dated = span > DAY;
    const minuteSuffix = language === "zh" ? "分" : "m";
    const sample = minuteOnly ? `00${minuteSuffix}` : dated ? "00/00" : "00:00";
    const spacing = Math.max(48, measureText(sample) + 18);
    const target = span * spacing / width;
    const intervalMs = (TIME_STEPS.find((step) => step * MINUTE >= target) || TIME_STEPS.at(-1)) * MINUTE;
    const twoLine = dated && intervalMs < DAY;
    const ticks = [];
    const first = new Date(range.start);
    if (intervalMs >= DAY) {
      first.setHours(0, 0, 0, 0);
      const dayIndex = Math.floor(Date.UTC(first.getFullYear(), first.getMonth(), first.getDate()) / DAY);
      const stepDays = intervalMs / DAY;
      first.setDate(first.getDate() - ((dayIndex % stepDays) + stepDays) % stepDays);
    } else {
      first.setSeconds(0, 0);
      if (intervalMs < 60 * MINUTE) first.setMinutes(Math.floor(first.getMinutes() / (intervalMs / MINUTE)) * (intervalMs / MINUTE));
      else {
        first.setMinutes(0);
        first.setHours(Math.floor(first.getHours() / (intervalMs / (60 * MINUTE))) * (intervalMs / (60 * MINUTE)));
      }
    }
    const pad = (value) => String(value).padStart(2, "0");
    const cursor = new Date(first);
    for (let count = 0; cursor.getTime() <= range.end && count < 1000; count++) {
      const time = cursor.getTime();
      if (time >= range.start) {
        const clock = `${pad(cursor.getHours())}:${pad(cursor.getMinutes())}`;
        const label = minuteOnly ? [`${pad(cursor.getMinutes())}${minuteSuffix}`]
          : dated ? [`${cursor.getMonth() + 1}/${cursor.getDate()}`, ...(twoLine ? [clock] : [])] : [clock];
        ticks.push({ time, label, major: true });
      }
      // Calendar-day ticks must stay at local midnight across daylight-saving changes.
      if (intervalMs >= DAY) cursor.setDate(cursor.getDate() + intervalMs / DAY);
      else cursor.setTime(time + intervalMs);
    }
    // Sub-minute grids keep close-up views readable without repeating minute labels.
    if (minuteOnly && intervalMs * width / span > 110) {
      const minorMs = [5000, 10000, 15000, 30000].find((step) => step * width / span >= 40);
      if (minorMs) {
        for (let time = Math.ceil(range.start / minorMs) * minorMs; time <= range.end; time += minorMs) {
          if (time % MINUTE !== 0) ticks.push({ time, label: [], major: false });
        }
      }
    }
    ticks.sort((a, b) => a.time - b.time);
    return { ticks, intervalMs, minuteOnly, twoLine };
  }

  function remainingToUsed(value) {
    const number = normalizePercent(value);
    return number === null ? null : 100 - number;
  }

  function zoomViewport(view, bounds, fraction, delta) {
    const anchor = Math.max(0, Math.min(1, fraction));
    const oldSpan = view.end - view.start;
    const span = Math.max(Math.min(60000, bounds.end - bounds.start),
      Math.min(bounds.end - bounds.start, oldSpan * Math.exp(Math.max(-2, Math.min(2, delta * 0.002)))));
    const start = view.start + oldSpan * anchor - span * anchor;
    return { start, end: start + span };
  }

  function panViewport(view, deltaPixels, width) {
    // Earlier timestamps move into view when the plotted content is pulled right.
    const delta = -deltaPixels / Math.max(1, width) * (view.end - view.start);
    return { start: view.start + delta, end: view.end + delta };
  }

  function bufferedHistoryRange(view) {
    const padding = Math.max(3600000, Math.min(view.end - view.start, 7 * 86400000));
    return { start: view.start - padding, end: view.end + padding };
  }

  function containsRange(container, view) {
    return Boolean(container && container.start <= view.start && container.end >= view.end);
  }

  function isInsidePlot(x, y, plot) {
    return Boolean(plot && x >= plot.left && x <= plot.right && y >= plot.top && y <= plot.bottom);
  }

  function visibleSeries(series, range) {
    const first = series.findIndex((point) => point.timestamp >= range.start);
    if (first < 0 || (first === 0 && series[0].timestamp > range.end)) return [];
    const end = series.findIndex((point, index) => index >= first && point.timestamp > range.end);
    return series.slice(Math.max(0, first - 1), end < 0 ? undefined : end + 1);
  }

  function normalizePercent(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return Math.max(0, Math.min(100, number));
  }

  function startOfLocalDay(value) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  function validDate(value) {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const api = { buildConsumptionSeries, buildQuotaSeries, getTimeAxis, getPeriodRange, shiftPeriod,
    zoomViewport, panViewport, bufferedHistoryRange, containsRange, isInsidePlot, visibleSeries };
  globalObject.historyUtils = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
