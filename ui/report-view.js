(function () {
  const strings = {
    zh: {
      title: "消耗报告", subtitle: "本机记录的 tokens · 北京时间", back: "返回", refresh: "重新统计",
      day: "日", week: "周", month: "月", previous: "上一时段", next: "下一时段", date: "选择日期",
      total: "总 tokens", input: "输入（含缓存）", output: "输出（含推理）", cached: "其中：缓存输入", reasoning: "其中：推理输出",
      dateLabel: "日期", loading: "正在统计本机日志...", missing: "没有可用的本机用量记录", pending: "此时段尚未结算",
      noRecord: "无记录", unsettled: "待日结", failed: "统计未完成，可点击重新统计重试。",
      partial: "部分日志无法读取或存在不完整记录，以下数值可能不完整。",
      coverage: "已结算至 {date} · {count} 天有记录", gaps: "另有 {count} 天无记录，不代表使用量为零。",
      updated: "统计时间：{time}",
      unknown: "另有 {count} tokens 无法确定发生日期，未计入本报告。",
      batched: "部分旧日志使用批量写入时间，日期归属可能不精确。",
      caveat: "仅统计本机 Codex 日志，不代表账号全部用量。总量 = 输入 + 输出；缓存与推理不重复相加。每天 23:59:59 开始日结，错过后自动补算。"
    },
    en: {
      title: "Usage reports", subtitle: "Local tokens · Beijing time", back: "Back", refresh: "Recalculate",
      day: "Day", week: "Week", month: "Month", previous: "Previous period", next: "Next period", date: "Select date",
      total: "Total tokens", input: "Input (includes cache)", output: "Output (includes reasoning)", cached: "Of input: cached", reasoning: "Of output: reasoning",
      dateLabel: "Date", loading: "Indexing local logs...", missing: "No local usage records available", pending: "This period is not settled yet",
      noRecord: "No records", unsettled: "Pending", failed: "Calculation incomplete. Select Recalculate to retry.",
      partial: "Some logs are unreadable or incomplete. These totals may be partial.",
      coverage: "Settled through {date} · {count} recorded days", gaps: "{count} other days have no records; this does not mean zero usage.",
      updated: "Calculated: {time}",
      unknown: "{count} additional tokens could not be dated and are excluded.",
      batched: "Some older logs have batch-write timestamps; their dates may be imprecise.",
      caveat: "Local Codex logs only, not account-wide usage. Total = input + output; cache and reasoning are not added twice. Daily settlement starts at 23:59:59 Beijing time, with catch-up after downtime."
    }
  };
  let lang = "zh";
  let period = "day";
  let anchor = key(Date.now() - 86400000);
  let visible = false;
  let view;
  let request = 0;
  let loading = false;
  let failed = false;
  const $ = (id) => document.getElementById(id);
  const tr = (name) => strings[lang][name];
  const count = (value) => value === null || value === undefined ? "--" : Number(value).toLocaleString(lang === "zh" ? "zh-CN" : "en-US");
  function key(time) { return new Date(time + 8 * 3600000).toISOString().slice(0, 10); }
  function start(date) { return Date.parse(`${date}T00:00:00+08:00`); }
  function label(id, text) { $(id).textContent = text; }
  function title(id, text) { $(id).title = text; $(id).setAttribute("aria-label", text); }
  function render() {
    title("reportsBtn", tr("title"));
    title("reportsBackBtn", tr("back"));
    title("reportsRefreshBtn", tr("refresh"));
    title("reportsPrevBtn", tr("previous"));
    title("reportsNextBtn", tr("next"));
    $("reportsDate").setAttribute("aria-label", tr("date"));
    $("reportsDate").value = anchor;
    $("reportsDate").max = key(Date.now());
    label("reportsTitle", tr("title"));
    label("reportsSubtitle", tr("subtitle"));
    for (const name of ["Total", "Input", "Output", "Cached", "Reasoning"]) label(`reports${name}Label`, tr(name.toLowerCase()));
    label("reportsDayLabel", tr("dateLabel"));
    document.querySelectorAll("[data-report-period]").forEach((button) => {
      const active = period === button.dataset.reportPeriod;
      button.textContent = tr(button.dataset.reportPeriod);
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    label("reportsRange", view ? view.startDate === view.endDate ? view.startDate : `${view.startDate} - ${view.endDate}` : anchor);
    $("reportsNextBtn").disabled = view ? view.end > start(key(Date.now())) : true;
    $("reportsRefreshBtn").disabled = loading || Boolean(view?.scanning);
    let notice = "";
    if (failed || view?.sourceStatus === "error") notice = tr("failed");
    else if (loading || view?.scanning) notice = tr("loading");
    else if (view?.sourceStatus === "partial" || view?.invalidRecords || view?.days.some((day) => day.incomplete)) notice = tr("partial");
    else if (!view?.totals) notice = tr(view?.sourceStatus === "missing" ? "missing" : view?.pendingDays ? "pending" : "missing");
    label("reportsStatus", notice);
    $("reportsStatus").hidden = !notice;
    for (const [id, field] of [["Total", "total_tokens"], ["Input", "input_tokens"], ["Output", "output_tokens"], ["Cached", "cached_input_tokens"], ["Reasoning", "reasoning_output_tokens"]]) {
      label(`reports${id}`, count(view?.totals?.[field]));
    }
    const coverage = [];
    if (view?.settledThrough) coverage.push(tr("coverage").replace("{date}", view.settledThrough).replace("{count}", view.recordedDays));
    if (view?.missingDays) coverage.push(tr("gaps").replace("{count}", view.missingDays));
    if (view?.updatedAt) coverage.push(tr("updated").replace("{time}", new Date(view.updatedAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-GB", {
      timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false
    })));
    label("reportsCoverage", coverage.join(" "));
    const rows = [];
    for (const day of view?.days || []) {
      const row = document.createElement("tr");
      const date = document.createElement("td");
      date.textContent = day.date;
      const value = document.createElement("td");
      value.textContent = day.status === "recorded" ? count(day.usage.total_tokens) : tr(day.status === "pending" ? "unsettled" : "noRecord");
      row.append(date, value);
      rows.push(row);
    }
    $("reportsDays").replaceChildren(...rows);
    $("reportsTable").hidden = period === "day" || !rows.length;
    const caveats = [tr("caveat")];
    if (view?.unknownTokens) caveats.push(tr("unknown").replace("{count}", count(view.unknownTokens)));
    if (view?.days.some((day) => day.timestampBatched)) caveats.push(tr("batched"));
    label("reportsCaveat", caveats.join(" "));
  }
  async function load() {
    if (!visible) return;
    const id = ++request;
    loading = true;
    failed = false;
    render();
    try {
      const value = await window.codexQuota.getReport({ period, anchor });
      if (id !== request) return;
      view = value;
    } catch {
      if (id !== request) return;
      failed = true;
      view = null;
    } finally {
      if (id === request) { loading = false; render(); }
    }
  }
  function navigate(direction) {
    if (!view) return;
    anchor = key(direction < 0 ? view.start - 1 : view.end);
    view = null;
    void load();
    $("reportsScroll").scrollTop = 0;
  }
  for (const button of document.querySelectorAll("[data-report-period]")) {
    button.addEventListener("click", () => {
      period = button.dataset.reportPeriod;
      view = null;
      void load();
      $("reportsScroll").scrollTop = 0;
    });
  }
  $("reportsPrevBtn").addEventListener("click", () => navigate(-1));
  $("reportsNextBtn").addEventListener("click", () => navigate(1));
  $("reportsDate").addEventListener("change", () => {
    const date = $("reportsDate").value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > key(Date.now())) return;
    anchor = date;
    view = null;
    void load();
  });
  $("reportsRefreshBtn").addEventListener("click", async () => {
    try { await window.codexQuota.refreshReports(); await load(); }
    catch { failed = true; render(); }
  });
  window.codexQuota.onReportUpdated?.(() => { if (visible) void load(); });
  window.tokenReportView = {
    setLanguage(value) { lang = value === "en" ? "en" : "zh"; render(); },
    setVisible(value) {
      visible = value;
      $("reportsPanel").hidden = !visible;
      $("reportsBtn").classList.toggle("active", visible);
      if (visible) void load();
    }
  };
})();
