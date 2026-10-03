const assert = require("node:assert/strict");
const test = require("node:test");
const { execFileSync } = require("node:child_process");
const { getTimeAxis, panViewport, zoomViewport } = require("../src/renderer/history-utils");
const minute = 60000;
const start = new Date(2026, 9, 3, 14, 3, 17).getTime();
const x = (time, range, width = 440) => (time - range.start) / (range.end - range.start) * width;

test("time grids stay anchored while panning and follow the same pixel displacement", () => {
  const range = { start, end: start + 5 * 3600000 };
  const shifted = panViewport(range, 57, 440);
  const before = getTimeAxis(range, 440);
  const after = getTimeAxis(shifted, 440);
  assert.equal(before.intervalMs, after.intervalMs);
  const shared = before.ticks.filter((tick) => after.ticks.some((other) => other.time === tick.time));
  assert.ok(shared.length > 2);
  for (const tick of shared) assert.ok(Math.abs(x(tick.time, shifted) - x(tick.time, range) - 57) < 0.001);
});

test("tick intervals adapt to time span and label width without a fixed count", () => {
  const counts = new Set();
  let previousInterval = 0;
  for (const minutes of [10, 40, 180, 300, 1440, 10080, 44640]) {
    const range = { start, end: start + minutes * minute };
    const axis = getTimeAxis(range, 440);
    const major = axis.ticks.filter((tick) => tick.major);
    assert.ok(axis.intervalMs >= previousInterval);
    previousInterval = axis.intervalMs;
    assert.ok(major.length >= 3 && major.length <= 10, `${minutes} min: ${major.length} ticks`);
    assert.ok(axis.intervalMs * 440 / (range.end - range.start) >= 48);
    counts.add(major.length);
  }
  assert.ok(counts.size > 1);
  const range = { start, end: start + 86400000 };
  assert.ok(getTimeAxis(range, 220).intervalMs > getTimeAxis(range, 880).intervalMs);
  assert.ok(getTimeAxis(range, 440, "en", () => 100).intervalMs > getTimeAxis(range, 440).intervalMs);
});

test("minute-only labels include the ten-minute boundary and fine grids avoid duplicate labels", () => {
  for (const lang of ["zh", "en"]) {
    for (const duration of [1, 2, 5, 10]) {
      const axis = getTimeAxis({ start, end: start + duration * minute }, 440, lang);
      const labels = axis.ticks.filter((tick) => tick.major).map((tick) => tick.label[0]);
      assert.equal(axis.minuteOnly, true);
      assert.ok(labels.every((label) => /^\d{2}(分|m)$/.test(label)));
      assert.equal(labels.length, new Set(labels).size);
      assert.ok(axis.ticks.length >= 4);
    }
  }
  assert.equal(getTimeAxis({ start, end: start + 10 * minute + 1 }, 440).minuteOnly, false);
});

test("zoom keeps the cursor time stationary while ticks change density", () => {
  const bounds = { start, end: start + 86400000 };
  const view = zoomViewport(bounds, bounds, 0.3, -1000);
  const anchor = bounds.start + (bounds.end - bounds.start) * 0.3;
  assert.ok(Math.abs(x(anchor, bounds) - x(anchor, view)) < 0.001);
  assert.ok(getTimeAxis(view, 440).intervalMs < getTimeAxis(bounds, 440).intervalMs);
});

test("daily ticks remain local midnight across daylight-saving transitions", () => {
  const output = execFileSync(process.execPath, ["-e", `
    const {getTimeAxis}=require('./src/renderer/history-utils');
    const range={start:new Date(2026,2,6).getTime(),end:new Date(2026,2,13).getTime()};
    const ticks=getTimeAxis(range,440).ticks;
    console.log(JSON.stringify(ticks.map(t=>({time:t.time,hour:new Date(t.time).getHours()}))));
  `], { cwd: require("node:path").join(__dirname, ".."), env: { ...process.env, TZ: "America/New_York" }, encoding: "utf8" });
  const ticks = JSON.parse(output);
  assert.ok(ticks.length >= 6);
  assert.ok(ticks.every((tick) => tick.hour === 0));
  assert.ok(ticks.some((tick, index) => index && tick.time - ticks[index - 1].time === 23 * 3600000));
});
