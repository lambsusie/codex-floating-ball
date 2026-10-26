(() => {
  const invoke = (method, value = null) => window.__TAURI__.core.invoke('call', { method, value });
  const listeners = new Map();
  const on = (name, callback) => { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(callback); };
  const emit = (name, value) => { for (const callback of listeners.get(name) || []) callback(value); };
  let saveTimer, saveQueue = Promise.resolve(), reportRunning = false, reportAgain = false;
  function preferences() {
    return Object.fromEntries(Object.keys(localStorage).filter(key => key.startsWith('codex-led-')).map(key => [key, localStorage.getItem(key)]));
  }
  function flushPreferences() {
    clearTimeout(saveTimer);
    const values = preferences();
    saveQueue = saveQueue.catch(() => {}).then(() => invoke('settings:ui', values));
    return saveQueue;
  }
  async function runReports() {
    if (reportRunning) { reportAgain = true; return; }
    reportRunning = true;
    emit('reports:updated');
    try {
      const data = await invoke('reports:scan');
      if (!data) return;
      emit('reports:updated');
      const report = await new Promise((resolve, reject) => {
        const worker = new Worker('report-worker.js');
        const finish = (error, value) => { clearTimeout(timer); worker.terminate(); error ? reject(error) : resolve(value); };
        const timer = setTimeout(() => finish(new Error('Report worker timed out')), 240000);
        worker.onmessage = ({ data }) => finish(data.ok ? null : new Error(data.error), data.report);
        worker.onerror = () => finish(new Error('Report worker failed'));
        worker.postMessage(data);
      });
      await invoke('reports:commit', report);
    } catch (error) {
      console.error('Report calculation failed:', String(error));
      await invoke('reports:fail').catch(() => {});
    } finally {
      reportRunning = false; emit('reports:updated');
      if (reportAgain) { reportAgain = false; void runReports(); }
    }
  }
  window.codexQuota = {
    getQuota: () => invoke('quota:get'),
    minimize: () => invoke('window:minimize'),
    close: async () => { await flushPreferences(); return invoke('window:close'); },
    getAlwaysOnTop: () => invoke('window:alwaysOnTop:get'), setAlwaysOnTop: value => invoke('window:alwaysOnTop:set', value),
    setDetailView: value => invoke('window:detailView:set', value), setHistoryPinned: value => invoke('window:historyPinned:set', value),
    getWindowMode: () => invoke('window:mode:get'), setWindowMode: value => invoke('window:mode:set', value),
    setCompactAlert: value => invoke('window:compactAlert:set', value),
    moveWindowBy: (dx, dy) => invoke('window:moveBy', { dx, dy }),
    getAutoRefreshMinutes: () => invoke('settings:autoRefresh:get'), setAutoRefreshMinutes: value => invoke('settings:autoRefresh:set', value),
    getCompactAppearance: () => invoke('settings:compactAppearance:get'), setCompactAppearance: value => invoke('settings:compactAppearance:set', value),
    getTheme: () => invoke('theme:get'), setTheme: value => invoke('theme:set', value),
    recordHistory: value => invoke('history:record', value), getHistory: value => invoke('history:get', value),
    exportHistory: value => invoke('history:export', value),
    getReport: async query => {
      const data = await invoke('reports:get');
      const view = ReportCore.getReportView(data.store, query);
      return { ...view, scanning: data.scanning || reportRunning, sourceStatus: data.failed ? 'error' : view.sourceStatus };
    },
    refreshReports: () => { void runReports(); return Promise.resolve(); },
    setTrayState: value => invoke('tray:state', value), getAppVersion: () => invoke('app:version'),
    checkForUpdates: () => invoke('updates:check'), notifyUpdate: value => invoke('updates:notify', value),
    openUpdatePage: () => invoke('updates:open'), openCodex: () => invoke('external:openCodex'),
    onReportUpdated: cb => on('reports:updated', cb), onRefresh: cb => on('quota:refresh', cb),
    onAlwaysOnTopChanged: cb => on('window:alwaysOnTopChanged', cb), onHistoryPinnedChanged: cb => on('window:historyPinnedChanged', cb),
    onWindowModeChanged: cb => on('window:modeChanged', cb), onThemeChanged: cb => on('theme:changed', cb)
  };
  async function boot() {
    for (const name of ['reports:updated','quota:refresh','window:alwaysOnTopChanged','window:historyPinnedChanged','window:modeChanged','theme:changed']) {
      await window.__TAURI__.event.listen(name, event => emit(name, event.payload));
    }
    await window.__TAURI__.event.listen('reports:due', () => { void runReports(); });
    const initial = await invoke('bootstrap');
    for (const [key, value] of Object.entries(initial.preferences || {})) if (key.startsWith('codex-led-') && typeof value === 'string') localStorage.setItem(key, value);
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      original.call(this, key, value);
      if (this === localStorage && key.startsWith('codex-led-')) {
        clearTimeout(saveTimer); saveTimer = setTimeout(() => flushPreferences().catch(error => console.error('Settings save failed:', error)), 100);
      }
    };
    for (const src of ['smart-refresh.js','history-utils.js','report-view.js','renderer.js']) {
      await new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = src; script.onload = resolve; script.onerror = reject; document.body.append(script); });
    }
    const titlebar = document.querySelector('.titlebar');
    let start;
    titlebar.addEventListener('pointerdown', event => { if (event.button === 0 && !event.target.closest('button,select,input')) start = { x: event.screenX, y: event.screenY }; });
    titlebar.addEventListener('pointermove', event => {
      if (start && event.buttons === 1 && Math.hypot(event.screenX-start.x, event.screenY-start.y)>4) { start = null; void invoke('window:drag'); }
    });
    titlebar.addEventListener('pointerup', () => { start = null; });
    titlebar.addEventListener('pointercancel', () => { start = null; });
    if (initial.migration?.status === 'partial') {
      const note = document.createElement('p'); note.className = 'settings-hint';
      note.textContent = '部分旧版设置未能自动导入，原始数据未修改。Partial legacy import; original data is unchanged.';
      document.querySelector('.settings-scroll').prepend(note);
    }
    window.migrationStatus = initial.migration;
    window.flushWidgetPreferences = flushPreferences;
    await runReports();
  }
  boot().catch(error => {
    console.error('Startup failed:', error);
    const target = document.getElementById('compactReset'); if (target) target.textContent = '启动失败 / Start failed';
  });
})();
