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

  function getAxisTickValues(mode, range) {
    const intervals = mode === "cycle" ? 5 : mode === "week" ? 7 : 6;
    const span = range.end - range.start;
    return Array.from({ length: intervals + 1 }, (_value, index) => (
      range.start + (span * index) / intervals
    ));
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

  const api = { buildConsumptionSeries, buildQuotaSeries, getAxisTickValues, getPeriodRange, shiftPeriod,
    zoomViewport, panViewport, bufferedHistoryRange, containsRange, isInsidePlot, visibleSeries };
  globalObject.historyUtils = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
