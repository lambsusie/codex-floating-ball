const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildConsumptionSeries,
  getPeriodRange,
  shiftPeriod
} = require("../src/renderer/history-utils");

test("builds local day and five-hour ranges", () => {
  const anchor = new Date(2026, 7, 27, 12, 30);
  const day = getPeriodRange("day", anchor);
  assert.equal(day.end - day.start, 24 * 3600000);

  const cycle = getPeriodRange("cycle", anchor);
  assert.equal(cycle.end - cycle.start, 5 * 3600000);
});

test("shifts a month without changing the period type", () => {
  const shifted = shiftPeriod("month", new Date(2026, 7, 15), -1);
  assert.equal(shifted.getMonth(), 6);
});

test("month navigation remains correct at the end of a long month", () => {
  const shifted = shiftPeriod("month", new Date(2026, 2, 31), -1);
  assert.equal(shifted.getFullYear(), 2026);
  assert.equal(shifted.getMonth(), 1);
  assert.equal(shifted.getDate(), 1);
});

test("converts remaining quota to consumed quota", () => {
  assert.deepEqual(buildConsumptionSeries([
    { timestamp: 10, primaryRemaining: 75, secondaryRemaining: 40 }
  ]), [
    { timestamp: 10, primaryUsed: 25, secondaryUsed: 60 }
  ]);
});
