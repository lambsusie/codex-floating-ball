const fs = require('node:fs');
const path = require('node:path');
let acorn;
try { acorn = require('acorn'); }
catch {
  const bundled = process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'];
  if (!bundled) throw new Error('Install acorn to regenerate the report core. Normal builds use the committed output.');
  const parser = { exports: {} };
  require('node:vm').runInNewContext(bundled, { module: parser, exports: parser.exports });
  acorn = parser.exports;
}
const root = path.resolve(__dirname, '..');
const select = (file, names) => {
  const source = fs.readFileSync(path.join(root, 'reference', file), 'utf8');
  return acorn.parse(source, { ecmaVersion: 'latest' }).body.filter(node => {
    if (node.type === 'FunctionDeclaration') return names.includes(node.id.name);
    if (node.type === 'VariableDeclaration') return node.declarations.every(item => names.includes(item.id.name));
    return false;
  }).map(node => source.slice(node.start, node.end)).join('\n\n');
};
const periods = ['DAY_MS','OFFSET_MS','dateKey','dayStart','shiftDate','reportRange','nextSettlementStart'];
const usage = ['FIELDS','emptyUsage','vector','same','usageFromVector','normalizeUsage','addUsage','aggregateUsage'];
const code = '// Generated from the v1.2.2 pure report algorithms; no Node runtime is required.\n(function () {\n' +
  select('report-periods.js', periods) + '\n' + select('token-usage.js', usage) + '\n' +
  select('token-report-service.js', ['getReportView']) + '\n' +
  `globalThis.ReportCore = { ${[...periods, ...usage, 'getReportView'].join(', ')} };\n})();\n`;
fs.writeFileSync(path.join(root, 'ui', 'report-core.js'), code);
