const SETTINGS_KEY = "beforeYouCopySettings";

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

async function getSettings() {
  const result = await getFromChrome(SETTINGS_KEY);
  return Object.assign({
    backendEndpoint: "",
    openaiApiKey: "",
    openaiModel: "gpt-4o-mini"
  }, result[SETTINGS_KEY] || {});
}

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

async function getResponseErrorMessage(response, serviceName) {
  let message = `${serviceName} LLM request failed with ${response.status}.`;
  let body = "";

  try {
    body = await response.text();
  } catch (error) {
    return message;
  }

  if (serviceName === "OpenAI") {
    try {
      const parsed = JSON.parse(body);
      const openAIMessage = parsed && parsed.error && parsed.error.message
        ? parsed.error.message
        : "";

      if (response.status === 401) {
        return "OpenAI LLM request failed with 401: invalid or unauthorized API key. Create a new API key, paste it into the popup, and reload the extension.";
      }

      if (openAIMessage) {
        return `${message} ${openAIMessage.replace(/sk-[A-Za-z0-9_-]+/g, "sk-***")}`;
      }
    } catch (error) {
      return message;
    }

    return message;
  }

  if (body) {
    return `${message} ${body.replace(/sk-[A-Za-z0-9_-]+/g, "sk-***").slice(0, 240)}`;
  }

  return message;
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
    throw new Error(await getResponseErrorMessage(response, "Backend"));
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
    throw new Error(await getResponseErrorMessage(response, "OpenAI"));
  }

  const data = await response.json();
  return parseJsonPayload(data.choices[0].message.content);
}

async function callJson(request) {
  const settings = await getSettings();
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "BYC_LLM_CALL") {
    return false;
  }

  callJson(message.request || {})
    .then((json) => {
      sendResponse({ ok: true, json });
    })
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error.message || String(error)
      });
    });

  return true;
});
