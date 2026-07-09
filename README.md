# Before You Copy

A Chrome extension that helps students pause before copying AI-generated output from ChatGPT. Instead of treating copying as a purely mechanical action, the extension turns the moment into a short GenAI literacy reflection: Teach -> Apply -> Feedback.

The extension is not a quiz generator, anti-cheating tool, AI blocker, or teacher dashboard. Its purpose is to support responsible AI use by helping students notice whether they understand, trust, and can appropriately adapt the AI output they are about to use.

---

## Motivation

As generative AI becomes increasingly integrated into academic and professional workflows, its influence on learning practices has become more complex. AI can clarify difficult concepts, draft fluent language, summarize information, and improve efficiency, but it can also make it easier to bypass the cognitive effort needed for understanding, authorship, verification, and long-term learning.

Students may copy fluent AI output before checking whether they can explain it, verify it, or make it their own. This can create an illusion of understanding or responsible use without the executive engagement that durable learning requires.

Before You Copy was designed to address this gap at the moment it matters most. When a student attempts to copy AI-generated text, the extension introduces a brief reflection scaffold that encourages active decision-making before the text enters the student's own work.

---

## Project Background

This repository began as the AI Active Recall Helper, a Chrome extension MVP that transformed AI-generated responses into active recall questions. That earlier version was developed as the final project for a Global Online Academy (GOA) Neuropsychology course.

Out of more than 15000 projects submitted across GOA courses, it was selected as one of 64 projects featured in the Global Showcase.

Global Showcase: https://vimeo.com/showcase/8942485

Project Presentation: https://docs.google.com/presentation/d/1Qc0ZJoAq3k1k9HVpxxh8wrLAeeg_cGzmgnikxPXfVkk/edit?usp=sharing

The current version evolves the original active-recall idea into a broader K-12 GenAI literacy scaffold. Instead of generating quizzes from AI responses, Before You Copy detects copy attempts on ChatGPT and routes students through short, task-specific responsible-use reflections.

---

## Features

- Detects the latest ChatGPT assistant response using a debounced `MutationObserver`
- Captures the latest user prompt when available
- Intercepts selected-text copy events and ChatGPT copy-button interactions
- Classifies the copy moment by task type, cognitive risk, intervention family, and risk level
- Supports 10 task routes:
  - explanation
  - factual lookup
  - writing generation
  - revision
  - problem solving
  - coding help
  - summarization
  - brainstorming
  - argumentation
  - translation
- Displays Teach -> Apply -> Feedback reflection modals
- Supports Gentle, Medium, High, and Auto friction modes
- Allows skipping so copying is never permanently blocked
- Provides LLM-based reflection evaluation with non-blocking fallbacks
- Stores anonymized local study logs in `chrome.storage.local`
- Exports study logs as CSV
- Keeps selected copied text out of logs by default
- Supports a backend proxy endpoint or a local development OpenAI key
- Includes popup diagnostics for testing detection, modal display, and LLM configuration
- Built with Chrome Manifest V3

---

## How It Works

### 1. Response Detection

A content script runs on supported ChatGPT domains and observes the page using a debounced `MutationObserver`. Once an AI response finishes changing, the script extracts the latest assistant message and stores it locally as `lastAIOutput`.

The script also attempts to save the latest user prompt so the classifier can better understand what kind of task the student was doing.

### 2. Copy Detection

When the student selects text and copies it, or clicks a ChatGPT copy button, the content script intercepts the copy action and opens a reflection modal.

The extension collects local context such as:

- selected text length
- page URL
- latest AI output excerpt
- latest user prompt excerpt
- selected friction mode
- prior low-effort reflection count
- exact-copy likelihood

### 3. Classification

The copy context is sent to the configured LLM classifier. The classifier returns structured JSON containing:

- `task_type`
- `cognitive_risk`
- `intervention_family`
- `risk_level`
- `risk_factors`
- `reason`

If LLM access is not configured, unavailable, or times out, the extension falls back to a manual task-type chooser and continues with a non-blocking scaffold.

### 4. Interactive Reflection

The selected intervention follows a Teach -> Apply -> Feedback pattern.

- Teach explains the responsible-use risk in the moment.
- Apply asks the student to respond with a quick reflection.
- Feedback responds to the student's answer and reinforces the learning goal.

Gentle mode uses short multiple-choice style reflection. Medium mode uses one open-ended prompt and may ask one follow-up for low-effort responses. High mode asks for an additional check and requires a stronger response before unlocking, while still allowing skip after follow-up. Auto mode maps low risk to Gentle, medium risk to Medium, and high risk to High.

### 5. Unlocking and Logging

After the student completes or skips the reflection, the extension copies the selected text to the clipboard.

Each event is saved locally with an anonymous participant ID and research-oriented metadata. Selected copied text is not stored unless the popup setting "Save selected excerpts for research" is enabled.

---

## LLM Configuration

Before You Copy does not hardcode an API key. The popup supports two development paths.

### Backend Proxy Endpoint

This is the recommended path for real deployments. Add a backend URL in the popup under **LLM configuration**.

The extension sends JSON with:

- `system_prompt`
- `user_prompt`
- `temperature`
- `response_format`
- `task`

The backend should keep production API keys on the server.

### Local Development OpenAI Key

For local development, paste an OpenAI API key into the popup. The key is stored in `chrome.storage.local` on the local browser.

Do not use this path for deployed student installs.

If no LLM access is configured, the extension still works with manual task selection and simple fallback evaluation so copy behavior is never stuck.

---

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to: `chrome://extensions`
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked**.
5. Select the project folder containing:
   - `manifest.json`
   - `contentScript.js`
   - `popup.html`
   - `popup.js`
6. Open `https://chatgpt.com` or `https://chat.openai.com`.

The extension icon should now appear in your browser toolbar.

---

## Usage

1. Open ChatGPT and generate an AI response.
2. Click the extension icon.
3. Choose a mode: Gentle, Medium, High, or Auto.
4. Optionally configure a backend proxy endpoint or local development OpenAI key.
5. Select text from a ChatGPT response and copy it, or use a ChatGPT copy button.
6. Complete the short reflection or choose to skip.
7. Continue copying after the extension unlocks the action.
8. Use **Export Study Logs as CSV** in the popup to download local research logs.

---

## Routing Table

| Task type | Cognitive risk | Intervention family |
| --- | --- | --- |
| explanation | passive comprehension | active_recall |
| factual_lookup | hallucination risk | verification |
| writing_generation | authorship loss | authorship_reflection |
| revision | loss of voice | revision_comparison |
| problem_solving | reasoning bypass | step_reconstruction |
| coding_help | debugging bypass | error_explanation |
| summarization | shallow synthesis | main_idea_recall |
| brainstorming | passive idea acceptance | selection_rationale |
| argumentation | one-sided reasoning | counterargument |
| translation | language-learning bypass | meaning_grammar_check |
| unknown | general overreliance | general_reflection |

---

## Privacy

Before You Copy stores study logs locally in `chrome.storage.local`.

It does not store names and does not store full ChatGPT conversations. It generates an anonymous participant ID locally.

By default, selected copied text is not stored. Logs store `selected_text_length` instead. The popup includes an optional **Save selected excerpts for research** setting. When enabled, selected text is stored locally in the event log.

For classification, the extension sends the latest AI output excerpt and metadata to the configured LLM. It sends the selected text excerpt only when the setting is enabled or when the selected text does not appear to match the latest AI output and the text is needed for classification.

---

## CSV Export

Use the popup button **Export Study Logs as CSV**.

CSV columns:

```text
participant_id,event_id,timestamp,url,selected_text_length,time_since_response,task_type,cognitive_risk,intervention_family,risk_level,risk_factors,mode,response_score,followup_used,skipped,skip_reason,unlocked,student_response
```

Use **Clear Logs** in the popup to remove local study logs.

---

## Project Structure

```text
|-- manifest.json         # Extension configuration (Manifest V3)
|-- background.js         # Background LLM request bridge
|-- contentScript.js      # ChatGPT detection, copy interception, modal orchestration
|-- modal.css             # Injected reflection modal styling
|-- popup.html            # Popup UI for settings, export, and diagnostics
|-- popup.js              # Popup behavior, settings, status, diagnostics, export
|-- storage.js            # Settings, participant ID, and local study logs
|-- llmClient.js          # Backend proxy or local development OpenAI client
|-- classifier.js         # Copy-event classifier prompt, validation, and fallback
|-- interventions.js      # Teach -> Apply -> Feedback intervention templates
|-- responseEvaluator.js  # Student reflection evaluator and fallback
|-- unlockPolicy.js       # Gentle, Medium, High, and Auto unlock rules
`-- csvExport.js          # Local CSV generation and download
```

---

## Known Limitations

- LLM quality depends on the configured backend or development key.
- Host permissions currently include OpenAI, localhost, and 127.0.0.1. A remote custom backend may need a manifest permission update or CORS support.
- The extension is designed for ChatGPT DOM structure and may need updates if ChatGPT markup changes.
- The extension detects copy events and copy-button interactions, not paste events.
- It does not include a teacher dashboard.
- It does not permanently prevent copying.

---

## Version

Current Version: 1.1.0

---

## License

No license file is currently included. Add a license before public distribution.
