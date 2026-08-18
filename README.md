# 🤖 AlgoBot — AI Pair Programmer for Technical Interviews

AlgoBot is a Chrome Extension that acts as a free AI assistant while you solve problems on **LeetCode** and **NeetCode** — similar to NeetCode's NeatBot, but completely free.

![AlgoBot Demo](https://img.shields.io/badge/LeetCode-✓-orange) ![AlgoBot Demo](https://img.shields.io/badge/NeetCode-✓-blue) ![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

- 💬 **Chat Tab** — Ask anything about your approach with full conversation memory
- 💡 **Hints Tab** — Progressive hints from Basic → Approach → Implementation → Full Solution
- 🎨 **Syntax Highlighting** — Code blocks rendered with proper colors (Python, JS, Java, C++)
- 🔄 **Model Fallback** — If the AI is overloaded, choose to retry with a different Gemini model
- ⚡ **Powered by Gemini** — Free Google AI (Gemini 3.7 Flash) for high quality coding hints

---

## 📁 Project Structure

```
algobot-extension/
├── manifest.json       # Chrome Extension config (Manifest V3)
├── content.js          # Injects the sidebar UI into LeetCode/NeetCode
├── inject.js           # Reads live code from Monaco/CodeMirror editor
├── background.js       # Extension service worker
├── styles.css          # All styles for the sidebar
├── popup.html          # Small popup shown when clicking the extension icon
└── server/
    ├── api.py          # FastAPI backend — calls Gemini API
    ├── main.py         # Server entry point
    ├── pyproject.toml  # Python dependencies (managed by uv)
    └── .env.example    # Template for your API key
```

---

## 🚀 Setup & Installation

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/algobot-extension.git
cd algobot-extension
```

### 2. Set up the backend

```bash
cd server

# Copy the env template and add your Gemini API key
cp .env.example .env
# Edit .env and paste your key from https://aistudio.google.com/apikey

# Install dependencies and start the server
uv run main.py
```

> **Don't have `uv`?** Install it with: `curl -LsSf https://astral.sh/uv/install.sh | sh`

The server will start at `http://127.0.0.1:8000`

### 3. Load the Chrome Extension

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer Mode** (top right toggle)
3. Click **Load Unpacked**
4. Select the root `algobot-extension/` folder

---

## 🔑 Getting a Free Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy it into `server/.env` as `GEMINI_API_KEY="your_key_here"`

The free tier gives you **1,500 requests/day** — more than enough for practice sessions.

---

## 🎯 How to Use

1. Open any problem on [LeetCode](https://leetcode.com/problems/) or [NeetCode](https://neetcode.io/problems/)
2. AlgoBot sidebar appears on the right side of the screen
3. **💬 Chat tab** — Type a question or click **Get Hint** for context-aware help
4. **💡 Hints tab** — Click **Generate Hints** for 4 progressive hints, revealed one at a time

---

## 🛠 Tech Stack

| Part | Technology |
|---|---|
| Chrome Extension | Manifest V3, Vanilla JS |
| Backend | Python, FastAPI, uvicorn |
| AI | Google Gemini 3.7 Flash (free tier) |
| Package Manager | [uv](https://astral.sh/uv) |

---

## 📄 License

MIT — free to use, modify, and share.
