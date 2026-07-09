(function () {
  const root = window.BeforeYouCopy || (window.BeforeYouCopy = {});

  const SETTINGS_KEY = "beforeYouCopySettings";
  const LOGS_KEY = "beforeYouCopyStudyLogs";
  const PARTICIPANT_ID_KEY = "beforeYouCopyParticipantId";

  const DEFAULT_SETTINGS = {
    mode: "medium",
    saveSelectedExcerpts: false,
    backendEndpoint: "",
    openaiApiKey: "",
    openaiModel: "gpt-4o-mini"
  };

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

  function setInChrome(values) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(values, () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(error);
          return;
        }
        resolve();
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

  function generateId(prefix) {
    const id = crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}_${id}`;
  }

  async function getSettings() {
    const result = await getFromChrome(SETTINGS_KEY);
    return Object.assign({}, DEFAULT_SETTINGS, result[SETTINGS_KEY] || {});
  }

  async function saveSettings(partialSettings) {
    const current = await getSettings();
    const next = Object.assign({}, current, partialSettings || {});
    await setInChrome({ [SETTINGS_KEY]: next });
    return next;
  }

  async function getLastAIOutput() {
    const result = await getFromChrome([
      "lastAIOutput",
      "lastAIOutputTimestamp",
      "lastUserPrompt",
      "lastUserPromptTimestamp"
    ]);
    return {
      lastAIOutput: result.lastAIOutput || "",
      lastAIOutputTimestamp: result.lastAIOutputTimestamp || null,
      lastUserPrompt: result.lastUserPrompt || "",
      lastUserPromptTimestamp: result.lastUserPromptTimestamp || null
    };
  }

  async function ensureParticipantId() {
    const result = await getFromChrome(PARTICIPANT_ID_KEY);
    if (result[PARTICIPANT_ID_KEY]) {
      return result[PARTICIPANT_ID_KEY];
    }

    const participantId = generateId("participant");
    await setInChrome({ [PARTICIPANT_ID_KEY]: participantId });
    return participantId;
  }

  async function getStudyLogs() {
    const result = await getFromChrome(LOGS_KEY);
    return Array.isArray(result[LOGS_KEY]) ? result[LOGS_KEY] : [];
  }

  async function appendStudyLog(log) {
    const participantId = await ensureParticipantId();
    const logs = await getStudyLogs();
    const nextLog = Object.assign({}, log, {
      participant_id: log.participant_id || participantId
    });

    logs.push(nextLog);
    await setInChrome({ [LOGS_KEY]: logs.slice(-1000) });
    return nextLog;
  }

  async function clearStudyLogs() {
    await removeFromChrome(LOGS_KEY);
  }

  async function countPriorLowEffortResponses() {
    const logs = await getStudyLogs();
    return logs.filter((log) => {
      const score = Number(log.response_score);
      return Number.isFinite(score) && score <= 1;
    }).length;
  }

  root.storage = {
    DEFAULT_SETTINGS,
    generateId,
    getSettings,
    saveSettings,
    getLastAIOutput,
    ensureParticipantId,
    getStudyLogs,
    appendStudyLog,
    clearStudyLogs,
    countPriorLowEffortResponses
  };
})();
