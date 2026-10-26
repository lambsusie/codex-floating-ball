const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const { aggregateUsage } = require('../reference/token-usage');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'qa', `real-${Date.now()}`);
const profile = path.join(output, 'profile');
fs.mkdirSync(profile, { recursive: true });
const legacy = path.join(process.env.APPDATA, 'codex-floating-ball');
const codex = process.env.CODEX_HOME || path.join(process.env.USERPROFILE, '.codex');
const executable = process.env.CFB_EXE || path.resolve(root, '../codex-floating-ball-v2.0-tauri-prototype/src-tauri/target/release/codex-floating-ball.exe');
const files = ['settings.json', 'quota-history.ndjson', 'token-reports.json', 'token-usage-index.json'];
const digest = file => fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null;
const before = Object.fromEntries(files.map(name => [name, digest(path.join(legacy, name))]));
const oldHistory = fs.readFileSync(path.join(legacy, 'quota-history.ndjson'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function main() {
  const server = net.createServer(); await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port; await new Promise(r => server.close(r));
  const child = spawn(executable, ['--qa-profile', profile, '--qa-legacy', legacy, '--qa-codex-home', codex, '--qa-debug-port', String(port)], { windowsHide: true, stdio: 'ignore' });
  let browser, page;
  const results = {};
  try {
    for (let i=0;i<100;i++) {
      try { await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(1000) }); browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`); break; }
      catch (error) { if (i === 0 || i === 99) console.log(`CDP attempt ${i + 1}: ${error.message}`); if (child.exitCode !== null) throw Error(`App exited ${child.exitCode}`); await sleep(200); }
    }
    assert.ok(browser); page = browser.contexts()[0].pages()[0];
    await page.waitForFunction(() => window.migrationStatus, null, { timeout: 60000 });
    const migration = await page.evaluate(() => window.migrationStatus);
    assert.equal(migration.status, 'imported', JSON.stringify(migration.warnings));
    assert.ok(migration.preferenceCount > 5);
    assert.ok(fs.readFileSync(path.join(profile, 'quota-history.ndjson')).subarray(0, oldHistory.length).equals(oldHistory));
    results.legacyMigration = { passed: true, preferenceCount: migration.preferenceCount, copied: migration.copied };
    console.log('PASS real legacy history and LevelDB preferences imported');
    await page.waitForFunction(() => typeof state !== 'undefined' && !state.loading && state.lastQuota, null, { timeout: 90000 });
    const quota = await page.evaluate(() => ({ primary: !!state.lastQuota.primary, secondary: !!state.lastQuota.secondary }));
    assert.ok(quota.primary || quota.secondary); results.liveQuota = { passed: true, ...quota };
    console.log('PASS real Codex app-server quota request');
    await page.waitForFunction(async () => {
      const value = await window.__TAURI__.core.invoke('call', { method: 'reports:get' });
      return value.store?.sourceStatus === 'ready' && !value.scanning;
    }, null, { timeout: 240000 });
    const report = JSON.parse(fs.readFileSync(path.join(profile, 'token-reports.json'), 'utf8'));
    const index = JSON.parse(fs.readFileSync(path.join(profile, 'token-usage-index.json'), 'utf8'));
    const expected = aggregateUsage(index.entries, report.updatedAt || Date.now());
    assert.deepEqual(report.days, expected.days);
    results.realReports = { passed: true, files: report.fileCount, days: Object.keys(report.days).length, originalAlgorithmParity: true };
    console.log('PASS real token metadata scan and original aggregation parity');
    await page.evaluate(() => window.flushWidgetPreferences());
    results.originalFilesUnchanged = files.every(name => before[name] === digest(path.join(legacy, name)));
    assert.ok(results.originalFilesUnchanged, 'Original files changed during test (check whether old app was running)');
    console.log('PASS original user data hashes unchanged');
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ passed: true, ...results }, null, 2));
    console.log(output);
  } catch (error) {
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ passed: false, ...results, error: String(error) }, null, 2));
    throw error;
  } finally {
    if (page) await page.evaluate(() => window.codexQuota?.close()).catch(() => {});
    if (browser) await browser.close().catch(() => {});
    await sleep(300); if (child.exitCode === null) child.kill();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
