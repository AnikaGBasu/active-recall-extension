# AI Active Recall Helper

A Chrome extension that transforms AI-generated responses into structured active recall quizzes. Instead of passively rereading AI outputs, users can immediately test their understanding through free-response and multiple-choice questions.

---

## Motivation

As AI tools become increasingly integrated into academic and professional workflows, their influence on learning practices has become more complex. While AI can clarify difficult concepts and improve efficiency, it can also reduce the cognitive effort required for deep understanding and long-term retention.

Research in cognitive psychology and neuropsychology emphasizes that durable learning depends on retrieval practice, active recall, and executive engagement. When students only read or generate AI explanations without testing themselves, they may experience an illusion of understanding without strengthening memory.

The AI Active Recall Helper was designed to address this gap. Instead of replacing thinking, the extension restructures AI outputs into retrieval-based questions, encouraging effortful recall and deeper cognitive processing.

---

## Project Background

This project was developed as the final project for a Global Online Academy (GOA) Neuropsychology course.

Out of more than 1,500 projects submitted across GOA courses, it was selected as one of 64 projects featured in the Global Showcase.

Global Showcase: https://vimeo.com/showcase/8942485

Project Presentation: https://docs.google.com/presentation/d/1Qc0ZJoAq3k1k9HVpxxh8wrLAeeg_cGzmgnikxPXfVkk/edit?usp=sharing

---

## Features

- Automatically detects the latest AI-generated response on supported ChatGPT pages
- Generates:
  - 3 short free-response questions
  - 3 multiple-choice questions (4 options each)
- Interactive MCQs with immediate feedback
- Reveal-on-demand free-response answers
- Lightweight, focused popup interface
- Built with Chrome Manifest V3

---

## How It Works

### 1. Response Detection

A content script runs on supported ChatGPT domains and observes the page using a debounced `MutationObserver`. Once an AI response finishes streaming, the script extracts the latest assistant message and stores it locally.

### 2. Quiz Generation

When the user clicks **Generate Quiz**:

- The stored AI output is sent to the OpenAI API.
- The model returns structured JSON containing:
  - Free-response questions
  - Corresponding answers
  - Multiple-choice questions with a correct index
- The popup renders the questions interactively.

### 3. Interactive Recall

- Multiple-choice questions provide immediate correctness feedback.
- Free-response answers remain hidden until the user clicks **Reveal**.
- The workflow prioritizes self-testing before answer exposure.

---

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to: chrome://extensions/
3. Enable **Developer Mode** (top-right).
4. Click **Load unpacked**.
5. Select the project folder containing:
- `manifest.json`
- `contentScript.js`
- `popup.html`
- `popup.js`

The extension icon should now appear in your browser toolbar.

---

## Usage

1. Open ChatGPT and generate an AI response.
2. Click the extension icon.
3. Select **Generate Quiz**.
4. Attempt the multiple-choice and free-response questions.
5. Reveal answers only after attempting recall.

---

## Project Structure

```text
├── manifest.json        # Extension configuration (Manifest V3)
├── contentScript.js     # Detects and extracts AI responses
├── popup.html           # Extension UI layout and styling
└── popup.js             # Quiz generation and rendering logic
```
---

## Version

Current Version: 1.0.1

---

## License

Specify your license here (e.g., MIT License).
