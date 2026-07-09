document.addEventListener("DOMContentLoaded", async () => {
  const storage = window.BeforeYouCopy.storage;
  const csvExport = window.BeforeYouCopy.csvExport;

  const status = document.getElementById("status");
  const message = document.getElementById("message");
  const modeSelect = document.getElementById("modeSelect");
  const saveSelectedExcerpts = document.getElementById("saveSelectedExcerpts");
  const backendEndpoint = document.getElementById("backendEndpoint");
  const openaiApiKey = document.getElementById("openaiApiKey");
  const openaiModel = document.getElementById("openaiModel");
  const saveAndTestApiKeyBtn = document.getElementById("saveAndTestApiKeyBtn");
  const clearApiKeyBtn = document.getElementById("clearApiKeyBtn");
  const exportLogsBtn = document.getElementById("exportLogsBtn");
  const clearLogsBtn = document.getElementById("clearLogsBtn");
  const runDiagnosticsBtn = document.getElementById("runDiagnosticsBtn");
  const testLlmBtn = document.getElementById("testLlmBtn");
  const testModalBtn = document.getElementById("testModalBtn");
  const clearDebugBtn = document.getElementById("clearDebugBtn");
  const debugOutput = document.getElementById("debugOutput");

  function showMessage(text, className = "") {
    message.textContent = text;
    message.className = className ? `message ${className}` : "message";
  }

  function wait(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  function getFromChrome(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (result) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(error);
          return;
        }
        resolve(result || {});
      });
    });
  }

  function removeFromChrome(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(keys, () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  function sendRuntimeMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve(response);
      });
    });
  }

  async function getActiveTab() {
    if (!chrome.tabs || !chrome.tabs.query) {
      return null;
    }
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs && tabs[0] ? tabs[0] : null;
  }

  function isChatGPTUrl(url) {
    return url.startsWith("https://chatgpt.com/") || url.startsWith("https://chat.openai.com/");
  }

  async function injectContentScripts(activeTab) {
    if (!chrome.scripting || !chrome.scripting.executeScript) {
      throw new Error("chrome.scripting is not available. Reload the extension after adding the scripting permission.");
    }

    const target = { tabId: activeTab.id };
    const files = [
      "storage.js",
      "llmClient.js",
      "classifier.js",
      "interventions.js",
      "responseEvaluator.js",
      "unlockPolicy.js",
      "contentScript.js"
    ];

    if (chrome.scripting.insertCSS) {
      await chrome.scripting.insertCSS({ target, files: ["modal.css"] });
    }

    for (const file of files) {
      await chrome.scripting.executeScript({ target, files: [file] });
    }

    await wait(250);
    return {
      injected: true,
      files
    };
  }

  function messageLooksLikeMissingReceiver(error) {
    const text = error && (error.message || String(error));
    return text.includes("Receiving end does not exist") ||
      text.includes("Could not establish connection");
  }

  async function sendMessageToActiveChatGPT(type, options = {}) {
    if (!chrome.tabs || !chrome.tabs.sendMessage) {
      throw new Error("chrome.tabs messaging is not available.");
    }

    const activeTab = await getActiveTab();
    if (!activeTab || !activeTab.id) {
      throw new Error("No active tab found.");
    }

    const url = activeTab.url || "";
    if (!isChatGPTUrl(url)) {
      throw new Error(`Active tab is not ChatGPT: ${url || "unknown URL"}`);
    }

    try {
      return await chrome.tabs.sendMessage(activeTab.id, { type });
    } catch (error) {
      if (!options.injectIfMissing || !messageLooksLikeMissingReceiver(error)) {
        throw error;
      }

      const injection = await injectContentScripts(activeTab);
      const response = await chrome.tabs.sendMessage(activeTab.id, { type });
      return Object.assign({}, response, {
        manual_injection: injection
      });
    }
  }

  async function requestActiveTabRescan() {
    try {
      await sendMessageToActiveChatGPT("BYC_FORCE_SAVE_LATEST", { injectIfMissing: true });
      await wait(150);
    } catch (error) {
      showMessage(error.message || "Refresh the ChatGPT tab, then reopen this popup.");
    }
  }

  async function runDiagnostics() {
    const activeTab = await getActiveTab();
    const report = {
      popup_time: new Date().toISOString(),
      extension_id: chrome.runtime.id,
      active_tab_url: activeTab ? activeTab.url || "" : "",
      active_tab_id_present: Boolean(activeTab && activeTab.id),
      llm_config: {
        backend_endpoint_set: false,
        openai_key_saved: false,
        openai_key_length: 0,
        model: ""
      },
      storage_last_user_prompt_length: 0,
      content_script_message: null,
      content_script_message_error: "",
      storage_last_ai_output_length: 0,
      debug_state: {},
      recent_debug_log: []
    };

    try {
      report.content_script_message = await sendMessageToActiveChatGPT("BYC_DEBUG_STATUS", { injectIfMissing: true });
    } catch (error) {
      report.content_script_message_error = error.message || String(error);
    }

    const stored = await getFromChrome([
      "lastAIOutput",
      "lastUserPrompt",
      "beforeYouCopySettings",
      "beforeYouCopyDebugState",
      "beforeYouCopyDebugLog"
    ]);

    const storedSettings = stored.beforeYouCopySettings || {};
    report.llm_config = {
      backend_endpoint_set: Boolean((storedSettings.backendEndpoint || "").trim()),
      openai_key_saved: Boolean((storedSettings.openaiApiKey || "").trim()),
      openai_key_length: (storedSettings.openaiApiKey || "").trim().length,
      model: storedSettings.openaiModel || "gpt-4o-mini"
    };
    report.storage_last_ai_output_length = stored.lastAIOutput ? stored.lastAIOutput.length : 0;
    report.storage_last_user_prompt_length = stored.lastUserPrompt ? stored.lastUserPrompt.length : 0;
    report.debug_state = stored.beforeYouCopyDebugState || {};
    report.recent_debug_log = Array.isArray(stored.beforeYouCopyDebugLog)
      ? stored.beforeYouCopyDebugLog.slice(-12)
      : [];

    debugOutput.textContent = JSON.stringify(report, null, 2);
    await refreshStatus();
    return report;
  }

  async function refreshStatus() {
    const { lastAIOutput } = await storage.getLastAIOutput();
    status.textContent = lastAIOutput
      ? "Latest AI output detected."
      : "Latest AI output not detected.";
  }

  async function loadSettings() {
    const settings = await storage.getSettings();
    modeSelect.value = settings.mode;
    saveSelectedExcerpts.checked = Boolean(settings.saveSelectedExcerpts);
    backendEndpoint.value = settings.backendEndpoint || "";
    openaiApiKey.value = settings.openaiApiKey || "";
    openaiModel.value = settings.openaiModel || "gpt-4o-mini";
  }

  async function saveSettings(partial) {
    await storage.saveSettings(partial);
    showMessage("Saved.", "saved");
  }

  async function testLlmConnection() {
    const response = await sendRuntimeMessage({
      type: "BYC_LLM_CALL",
      request: {
        task: "debug_llm_connection",
        systemPrompt: "Return only valid JSON.",
        userPrompt: "Return {\"ok\":true,\"message\":\"LLM connection works\"}.",
        temperature: 0
      }
    });

    if (!response || !response.ok) {
      throw new Error((response && response.error) || "LLM test failed.");
    }

    return response.json;
  }

  modeSelect.addEventListener("change", () => {
    saveSettings({ mode: modeSelect.value });
  });

  saveSelectedExcerpts.addEventListener("change", () => {
    saveSettings({ saveSelectedExcerpts: saveSelectedExcerpts.checked });
  });

  backendEndpoint.addEventListener("change", () => {
    saveSettings({ backendEndpoint: backendEndpoint.value.trim() });
  });
  backendEndpoint.addEventListener("input", () => {
    saveSettings({ backendEndpoint: backendEndpoint.value.trim() });
  });

  openaiApiKey.addEventListener("change", () => {
    saveSettings({ openaiApiKey: openaiApiKey.value.trim() });
  });
  openaiApiKey.addEventListener("input", () => {
    saveSettings({ openaiApiKey: openaiApiKey.value.trim() });
  });

  clearApiKeyBtn.addEventListener("click", async () => {
    openaiApiKey.value = "";
    await saveSettings({ openaiApiKey: "" });
    await runDiagnostics();
    showMessage("Saved API key cleared.", "saved");
  });

  saveAndTestApiKeyBtn.addEventListener("click", async () => {
    const key = openaiApiKey.value.trim();
    if (!key) {
      showMessage("Paste an API key first.");
      return;
    }

    showMessage("Saving and testing API key...");
    await saveSettings({
      openaiApiKey: key,
      openaiModel: openaiModel.value.trim() || "gpt-4o-mini"
    });

    try {
      const result = await testLlmConnection();
      await runDiagnostics();
      showMessage(`API key works: ${result.message || "received valid JSON"}`, "saved");
    } catch (error) {
      await runDiagnostics();
      showMessage(`API key saved, but test failed: ${error.message || String(error)}`);
    }
  });

  openaiModel.addEventListener("change", () => {
    saveSettings({ openaiModel: openaiModel.value.trim() || "gpt-4o-mini" });
  });
  openaiModel.addEventListener("input", () => {
    saveSettings({ openaiModel: openaiModel.value.trim() || "gpt-4o-mini" });
  });

  exportLogsBtn.addEventListener("click", async () => {
    const logs = await storage.getStudyLogs();
    if (!logs.length) {
      showMessage("No logs to export yet.");
      return;
    }

    csvExport.downloadLogsAsCsv(logs);
    showMessage(`Exported ${logs.length} log${logs.length === 1 ? "" : "s"}.`, "saved");
  });

  clearLogsBtn.addEventListener("click", async () => {
    const confirmed = window.confirm("Clear all local study logs?");
    if (!confirmed) {
      return;
    }

    await storage.clearStudyLogs();
    showMessage("Logs cleared.", "saved");
  });

  runDiagnosticsBtn.addEventListener("click", async () => {
    showMessage("Running diagnostics...");
    await runDiagnostics();
    showMessage("Diagnostics updated.", "saved");
  });

  testLlmBtn.addEventListener("click", async () => {
    showMessage("Testing LLM...");
    try {
      const result = await testLlmConnection();
      await runDiagnostics();
      showMessage(`LLM works: ${result.message || "received valid JSON"}`, "saved");
    } catch (error) {
      await runDiagnostics();
      showMessage(`LLM error: ${error.message || String(error)}`);
    }
  });

  testModalBtn.addEventListener("click", async () => {
    try {
      await sendMessageToActiveChatGPT("BYC_TEST_MODAL", { injectIfMissing: true });
      showMessage("Test modal message sent.", "saved");
      await runDiagnostics();
    } catch (error) {
      showMessage(error.message || String(error));
      await runDiagnostics();
    }
  });

  clearDebugBtn.addEventListener("click", async () => {
    await removeFromChrome(["beforeYouCopyDebugState", "beforeYouCopyDebugLog"]);
    debugOutput.textContent = "Debug logs cleared. Run diagnostics again.";
    showMessage("Debug logs cleared.", "saved");
  });

  await loadSettings();
  await requestActiveTabRescan();
  await refreshStatus();
  await runDiagnostics();
});
