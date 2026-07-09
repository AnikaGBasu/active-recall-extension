(function () {
  const root = window.BeforeYouCopy || (window.BeforeYouCopy = {});

  const CSV_COLUMNS = [
    "participant_id",
    "event_id",
    "timestamp",
    "url",
    "selected_text_length",
    "time_since_response",
    "task_type",
    "cognitive_risk",
    "intervention_family",
    "risk_level",
    "risk_factors",
    "mode",
    "response_score",
    "followup_used",
    "skipped",
    "skip_reason",
    "unlocked",
    "student_response"
  ];

  function escapeCell(value) {
    if (value === null || value === undefined) {
      return "";
    }

    const normalized = Array.isArray(value) ? value.join("; ") : String(value);
    const escaped = normalized.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  function logsToCsv(logs) {
    const rows = [CSV_COLUMNS.join(",")];
    logs.forEach((log) => {
      rows.push(CSV_COLUMNS.map((column) => escapeCell(log[column])).join(","));
    });
    return rows.join("\n");
  }

  function downloadLogsAsCsv(logs) {
    const csv = logsToCsv(logs);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `before-you-copy-logs-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  root.csvExport = {
    CSV_COLUMNS,
    logsToCsv,
    downloadLogsAsCsv
  };
})();
