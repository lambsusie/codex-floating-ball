importScripts('report-core.js');
self.onmessage = ({ data }) => {
  try {
    const report = ReportCore.aggregateUsage(data.entries, data.now);
    Object.assign(report, { sourceStatus: data.sourceStatus, readErrorCount: data.readErrorCount, fileCount: data.fileCount });
    self.postMessage({ ok: true, report });
  } catch (error) { self.postMessage({ ok: false, error: String(error) }); }
};
