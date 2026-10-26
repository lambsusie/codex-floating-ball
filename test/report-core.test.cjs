const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const original = require('../reference/token-usage');
const originalView = require('../reference/token-report-service');
const sandbox = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../ui/report-core.js'), 'utf8'), sandbox);
const core = sandbox.ReportCore;
const plain = value => JSON.parse(JSON.stringify(value));
const now = Date.parse('2026-10-03T00:05:00+08:00');
const usage = (input, output = 10) => ({ input_tokens: input, output_tokens: output, total_tokens: input + output });
const snapshot = (day, total, last = total, line = 1) => ({ type: 'snapshot', timestamp: `2026-10-${day}T01:00:00+08:00`, total, last, line });
const entry = (events, id = 'a', parent) => ({ meta: { id, parent }, events });
const ledger = (response, total, day = '01') => ({ type: 'ledger', timestamp: `2026-10-${day}T01:00:00+08:00`, session: 'a', response, usage: total, line: 1 });
const cases = {
  cumulative: { a: entry([snapshot('01', usage(100)), snapshot('02', usage(300, 30), usage(200, 20), 2)]) },
  ledgerAndSnapshot: { a: entry([ledger('r1', usage(100)), snapshot('01', usage(100), usage(100), 2)]) },
  reset: { a: entry([snapshot('01', usage(100)), snapshot('02', usage(20), usage(20), 2)]) },
  undatedBaseline: { a: entry([snapshot('02', usage(1000, 100), usage(100))]) },
  inheritedFork: { a: entry([snapshot('01', usage(100))]), b: entry([snapshot('02', usage(130, 15), usage(30, 5))], 'b', 'a') },
  invalid: { a: entry([snapshot('01', usage(-10)), snapshot('02', { ...usage(100), total_tokens: 999 })]) },
  empty: {},
};
cases.archivedDuplicates = { ...cases.cumulative, z: cases.cumulative.a };
cases.duplicateResponses = { a: cases.ledgerAndSnapshot.a, z: cases.ledgerAndSnapshot.a };
for (const [name, entries] of Object.entries(cases)) test(`report migration preserves ${name}`, () => {
  const result = core.aggregateUsage(entries, now);
  assert.deepEqual(plain(result), original.aggregateUsage(entries, now));
  for (const period of ['day', 'week', 'month']) {
    const query = { period, anchor: '2026-10-02' };
    assert.deepEqual(plain(core.getReportView(result, query, now)), plain(originalView.getReportView(result, query, now)));
  }
});
test('Beijing midnight, leap month, settlement excludes today', () => {
  assert.equal(core.dateKey(Date.parse('2026-10-01T15:59:59.999Z')), '2026-10-01');
  assert.equal(core.dateKey(Date.parse('2026-10-01T16:00:00Z')), '2026-10-02');
  assert.equal(core.reportRange('month', '2024-02-29').endDate, '2024-02-29');
  assert.equal(core.reportRange('week', '2026-10-02').startDate, '2026-09-28');
  assert.throws(() => core.dayStart('2026-02-30'));
  const report = core.aggregateUsage(cases.cumulative, now);
  assert.equal(core.getReportView(report, { anchor: '2026-10-03' }, now).totals, null);
});
