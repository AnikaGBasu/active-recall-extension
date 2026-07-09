(function () {
  const root = window.BeforeYouCopy || (window.BeforeYouCopy = {});

  function parseJsonPayload(payload) {
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      return payload;
    }

    if (typeof payload !== "string") {
      throw new Error("LLM response did not contain JSON.");
    }

    const trimmed = payload.trim();
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    const jsonText = firstBrace >= 0 && lastBrace >= firstBrace
      ? trimmed.slice(firstBrace, lastBrace + 1)
      : trimmed;

    return JSON.parse(jsonText);
  }

  function extractJsonFromBackendResponse(data) {
    if (data && data.result) {
      return parseJsonPayload(data.result);
    }
    if (data && data.json) {
      return parseJsonPayload(data.json);
    }
    if (data && data.content) {
      return parseJsonPayload(data.content);
    }
    if (data && data.choices && data.choices[0]) {
      return parseJsonPayload(data.choices[0].message.content);
    }
    return parseJsonPayload(data);
  }

  async function callBackend(endpoint, request) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_prompt: request.systemPrompt,
        user_prompt: request.userPrompt,
        temperature: request.temperature ?? 0.1,
        response_format: "json_object",
        task: request.task || "json"
      })
    });

    if (!response.ok) {
      throw new Error(`Backend LLM request failed with ${response.status}.`);
    }

    const data = await response.json();
    return extractJsonFromBackendResponse(data);
  }

  async function callOpenAI(settings, request) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.openaiApiKey}`
      },
      body: JSON.stringify({
        model: settings.openaiModel || "gpt-4o-mini",
        messages: [
          { role: "system", content: request.systemPrompt },
          { role: "user", content: request.userPrompt }
        ],
        temperature: request.temperature ?? 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI LLM request failed with ${response.status}.`);
    }

    const data = await response.json();
    return parseJsonPayload(data.choices[0].message.content);
  }

  function sendRuntimeMessage(message) {
    return new Promise((resolve, reject) => {
      if (!chrome.runtime || !chrome.runtime.sendMessage) {
        reject(new Error("Chrome runtime messaging is unavailable."));
        return;
      }

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

  function shouldUseBackgroundProxy() {
    return window.location && window.location.protocol !== "chrome-extension:";
  }

  async function callViaBackground(request) {
    const response = await sendRuntimeMessage({
      type: "BYC_LLM_CALL",
      request
    });

    if (!response || !response.ok) {
      throw new Error((response && response.error) || "Background LLM request failed.");
    }

    return response.json;
  }

  async function callJson(request) {
    if (shouldUseBackgroundProxy()) {
      return callViaBackground(request);
    }

    const settings = await root.storage.getSettings();
    const endpoint = (settings.backendEndpoint || "").trim();
    const apiKey = (settings.openaiApiKey || "").trim();

    if (endpoint) {
      return callBackend(endpoint, request);
    }

    if (apiKey) {
      return callOpenAI(settings, request);
    }

    throw new Error("LLM_NOT_CONFIGURED");
  }

  async function getConfigurationStatus() {
    const settings = await root.storage.getSettings();
    if ((settings.backendEndpoint || "").trim()) {
      return "backend";
    }
    if ((settings.openaiApiKey || "").trim()) {
      return "development_key";
    }
    return "not_configured";
  }

  root.llmClient = {
    callJson,
    getConfigurationStatus
  };
})();
