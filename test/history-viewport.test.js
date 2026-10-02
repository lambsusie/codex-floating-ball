const test = require("node:test");
const assert = require("node:assert/strict");
const { zoomViewport, panViewport, bufferedHistoryRange, containsRange, isInsidePlot, visibleSeries } = require("../src/renderer/history-utils");
test("wheel zoom anchors the pointer and limits span without clamping the date", () => {
  const bounds = { start: 100000, end: 18100000 };
  const zoomed = zoomViewport(bounds, bounds, 0.25, -240);
  assert.ok(zoomed.end - zoomed.start < bounds.end - bounds.start);
  assert.ok(Math.abs(zoomed.start + (zoomed.end - zoomed.start) * 0.25 - (bounds.start + 4500000)) < 0.001);
  let view = zoomed;
  for (let i = 0; i < 30; i++) view = zoomViewport(view, bounds, 0.5, -1000);
  assert.equal(Math.round(view.end - view.start), 60000);
  for (let i = 0; i < 30; i++) view = zoomViewport(view, bounds, 0.5, 1000);
  assert.equal(view.end - view.start, bounds.end - bounds.start);
  const panned = panViewport(bounds, 900, 400);
  assert.deepEqual(zoomViewport(panned, bounds, 0.5, 1000), panned);
});
test("drag follows the mouse pixel for pixel at full size and when zoomed", () => {
  const bounds = { start: 0, end: 10000000 }, view = { start: 2000000, end: 4000000 };
  assert.deepEqual(panViewport(view, 100, 400), { start: 1500000, end: 3500000 });
  for (const range of [bounds, view]) for (const delta of [-900, -100, 0, 100, 900]) {
    const after = panViewport(range, delta, 400);
    const pointTime = (range.start + range.end) / 2;
    const xBefore = (pointTime - range.start) / (range.end - range.start) * 400;
    const xAfter = (pointTime - after.start) / (after.end - after.start) * 400;
    assert.equal(xAfter - xBefore, delta);
    assert.deepEqual(panViewport(after, -delta, 400), range);
  }
  assert.ok(panViewport(bounds, 100, 400).start < bounds.start);
  assert.ok(panViewport(bounds, -100, 400).end > bounds.end);
  assert.equal(isInsidePlot(40, 30, { left: 38, right: 400, top: 10, bottom: 140 }), true);
  assert.equal(isInsidePlot(20, 30, { left: 38, right: 400, top: 10, bottom: 140 }), false);
});
test("adjacent dates are buffered and cached coverage never clamps panning", () => {
  const view = { start: 1e12, end: 1e12 + 86400000 };
  const loaded = bufferedHistoryRange(view);
  assert.equal(loaded.start, view.start - 86400000);
  assert.equal(containsRange(loaded, panViewport(view, 300, 400)), true);
  const moved = panViewport(view, 1000, 400);
  assert.equal(containsRange(loaded, moved), false);
  assert.equal(containsRange(bufferedHistoryRange(moved), moved), true);
});
test("zoom retains neighboring points to draw continuous clipped lines", () => {
  const series = [1, 2, 3, 4, 5].map((timestamp) => ({ timestamp }));
  assert.deepEqual(visibleSeries(series, { start: 2.5, end: 3.5 }).map((p) => p.timestamp), [2, 3, 4]);
  assert.deepEqual(visibleSeries(series, { start: 6, end: 8 }), []);
  assert.deepEqual(visibleSeries(series, { start: -2, end: 0 }), []);
});
