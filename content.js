console.log("🤖 AlgoBot Content Script Initialized!");

// ══════════════════════════════════════════════════════
//  TEXT FORMATTER — parses markdown code blocks and
//  applies syntax highlighting
// ══════════════════════════════════════════════════════

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const KEYWORDS = new Set([
  // Python
  "def","class","return","if","elif","else","for","while","in","and","or",
  "not","True","False","None","import","from","lambda","pass","break",
  "continue","try","except","finally","with","as","yield","async","await",
  "self","is","del","global","nonlocal","raise","assert",
  // JS / TS
  "var","let","const","function","new","this","null","undefined","typeof",
  "instanceof","throw","switch","case","default","do","of","export","import",
  // Java / C++
  "public","private","protected","static","void","int","long","double",
  "float","boolean","string","bool","char","auto","return","struct","enum",
  // Common types
  "List","Dict","Set","Tuple","Optional","Any","int","str","bool",
]);

function tokenizeCode(code) {
  const tokens = [];
  let i = 0;
  const n = code.length;

  while (i < n) {
    // Triple-quoted strings (Python)
    if ((code[i] === '"' && code[i+1] === '"' && code[i+2] === '"') ||
        (code[i] === "'" && code[i+1] === "'" && code[i+2] === "'")) {
      const q = code.slice(i, i+3);
      let j = i + 3;
      while (j < n && code.slice(j, j+3) !== q) j++;
      j += 3;
      tokens.push({ t: "string", v: code.slice(i, j) }); i = j; continue;
    }
    // Single-line strings
    if (code[i] === '"' || code[i] === "'") {
      const q = code[i]; let j = i + 1;
      while (j < n && code[j] !== q && code[j] !== "\n") {
        if (code[j] === "\\") j++;
        j++;
      }
      j++;
      tokens.push({ t: "string", v: code.slice(i, j) }); i = j; continue;
    }
    // Python comment
    if (code[i] === "#") {
      let j = i;
      while (j < n && code[j] !== "\n") j++;
      tokens.push({ t: "comment", v: code.slice(i, j) }); i = j; continue;
    }
    // C-style comment
    if (code[i] === "/" && code[i+1] === "/") {
      let j = i;
      while (j < n && code[j] !== "\n") j++;
      tokens.push({ t: "comment", v: code.slice(i, j) }); i = j; continue;
    }
    // Identifier / keyword
    if (/[a-zA-Z_]/.test(code[i])) {
      let j = i;
      while (j < n && /[a-zA-Z0-9_]/.test(code[j])) j++;
      const word = code.slice(i, j);
      tokens.push({ t: KEYWORDS.has(word) ? "keyword" : "ident", v: word });
      i = j; continue;
    }
    // Number
    if (/[0-9]/.test(code[i])) {
      let j = i;
      while (j < n && /[0-9.xXa-fA-FbBoO]/.test(code[j])) j++;
      tokens.push({ t: "number", v: code.slice(i, j) }); i = j; continue;
    }
    // Everything else (operators, punctuation, whitespace)
    tokens.push({ t: "other", v: code[i] }); i++;
  }

  return tokens.map(({ t, v }) => {
    const e = escapeHtml(v);
    if (t === "string")  return `<span class="algob-str">${e}</span>`;
    if (t === "comment") return `<span class="algob-comment">${e}</span>`;
    if (t === "keyword") return `<span class="algob-kw">${e}</span>`;
    if (t === "number")  return `<span class="algob-num">${e}</span>`;
    return e;
  }).join("");
}

/**
 * Converts a plain text response (possibly containing ```lang ... ``` blocks)
 * into an HTML string with highlighted code blocks.
 */
function formatText(raw) {
  const result = [];
  let i = 0;

  while (i < raw.length) {
    // Detect opening ```
    if (raw[i] === '`' && raw[i+1] === '`' && raw[i+2] === '`') {
      // Find end of first line to extract language
      let j = i + 3;
      while (j < raw.length && raw[j] !== '\n') j++;
      const lang = raw.slice(i + 3, j).trim();

      // Find closing ```
      const closeIdx = raw.indexOf('```', j + 1);
      if (closeIdx === -1) {
        // No closing fence — treat rest as plain text
        result.push(`<span>${escapeHtml(raw.slice(i)).replace(/\n/g, '<br>')}</span>`);
        i = raw.length;
        break;
      }

      // Extract code content (skip the newline after the lang line)
      const code = raw.slice(j + 1, closeIdx).replace(/\n$/, '');
      const highlighted = tokenizeCode(code);

      result.push(
        `<div class="algob-code-wrap">` +
        (lang ? `<div class="algob-code-lang">${escapeHtml(lang)}</div>` : '') +
        `<pre class="algob-pre">${highlighted}</pre></div>`
      );

      i = closeIdx + 3; // skip past closing ```
    } else {
      // Collect plain text until next ``` or end
      let j = i;
      while (j < raw.length && !(raw[j] === '`' && raw[j+1] === '`' && raw[j+2] === '`')) j++;
      // Render plain text — escape HTML, newlines to <br>, inline `code` to <code>
      const text = escapeHtml(raw.slice(i, j))
        .replace(/\n/g, '<br>')
        .replace(/`([^`\n]+)`/g, '<code class="algob-inline">$1</code>');
      result.push(`<span>${text}</span>`);
      i = j;
    }
  }

  return result.join('');
}




if (!document.getElementById("algobot-sidebar")) {
  // ── Inject inject.js into page context ──────────────────────────────────
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("inject.js");
  script.onload = function () { this.remove(); };
  (document.head || document.documentElement).appendChild(script);

  // ── Build Sidebar HTML ───────────────────────────────────────────────────
  const sidebar = document.createElement("div");
  sidebar.id = "algobot-sidebar";
  sidebar.innerHTML = `
    <div id="algobot-toggle-tab" title="Toggle AlgoBot">
      <span id="algobot-tab-icon">🤖</span>
    </div>

    <div id="algobot-panel">
      <!-- Header -->
      <div id="algobot-header">
        <span id="algobot-logo">🤖 AlgoBot</span>
        <div id="algobot-tabs">
          <button class="algobot-tab active" data-tab="chat">💬 Chat</button>
          <button class="algobot-tab" data-tab="hints">💡 Hints</button>
        </div>
      </div>

      <!-- ── CHAT TAB ── -->
      <div id="algobot-tab-chat" class="algobot-tab-content active">
        <div id="algobot-chat-body">
          <div class="algobot-msg algobot-msg--bot">
            👋 Stuck? Ask me anything about your approach, or just click <b>Get Hint</b>!
          </div>
        </div>
        <div id="algobot-chat-footer">
          <div id="algobot-input-row">
            <input id="algobot-input" type="text" placeholder="Ask a follow-up..." />
            <button id="algobot-send-btn">Get Hint</button>
          </div>
          <button id="algobot-clear-btn">🗑 Clear Chat</button>
        </div>
      </div>

      <!-- ── HINTS TAB ── -->
      <div id="algobot-tab-hints" class="algobot-tab-content">
        <div id="algobot-hints-body">
          <div id="algobot-hints-intro">
            <p>Get progressive hints for this problem — from a gentle nudge all the way to the full solution.</p>
            <button id="algobot-load-hints-btn">✨ Generate Hints</button>
          </div>
          <div id="algobot-hints-list" style="display:none;"></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(sidebar);

  // ── State ────────────────────────────────────────────────────────────────
  let panelOpen = true;
  let activeTab = "chat";
  let isChatFetching = false;
  let isHintsFetching = false;
  let pendingUserQuery = "";
  let conversationHistory = [];
  let hintsRevealed = 0;
  let allHints = [];

  const panel       = document.getElementById("algobot-panel");
  const toggleTab   = document.getElementById("algobot-toggle-tab");
  const tabIcon     = document.getElementById("algobot-tab-icon");
  const chatBody    = document.getElementById("algobot-chat-body");
  const sendBtn     = document.getElementById("algobot-send-btn");
  const inputField  = document.getElementById("algobot-input");
  const clearBtn    = document.getElementById("algobot-clear-btn");
  const hintsList   = document.getElementById("algobot-hints-list");
  const hintsIntro  = document.getElementById("algobot-hints-intro");
  const loadHintsBtn = document.getElementById("algobot-load-hints-btn");

  // ── Toggle Sidebar ───────────────────────────────────────────────────────
  toggleTab.addEventListener("click", () => {
    panelOpen = !panelOpen;
    panel.style.display = panelOpen ? "flex" : "none";
    tabIcon.textContent = panelOpen ? "✕" : "🤖";
    sidebar.classList.toggle("algobot-collapsed", !panelOpen);
  });

  // ── Tab Switching ────────────────────────────────────────────────────────
  document.querySelectorAll(".algobot-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      activeTab = btn.dataset.tab;
      document.querySelectorAll(".algobot-tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".algobot-tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`algobot-tab-${activeTab}`).classList.add("active");
    });
  });

  // ── Helper: append a chat bubble ─────────────────────────────────────
  function appendMsg(role, text) {
    const msg = document.createElement("div");
    msg.className = `algobot-msg algobot-msg--${role === "user" ? "user" : "bot"}`;
    if (role === "user") {
      msg.innerText = text;
    } else {
      msg.innerHTML = formatText(text);
    }
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
    return msg;
  }

  // ── Helper: show retry model buttons in chat ───────────────────────────
  function showChatRetryButtons(lastCode, lastTitle) {
    const wrap = document.createElement("div");
    wrap.className = "algobot-retry-wrap";
    wrap.innerHTML = `
      <p class="algobot-retry-label">⚠️ Model is overloaded. Retry with:</p>
      <div class="algobot-retry-btns">
        <button class="algobot-retry-btn" data-model="gemini-3.7-flash">3.7 Flash</button>
        <button class="algobot-retry-btn" data-model="gemini-3.6-flash">3.6 Flash</button>
        <button class="algobot-retry-btn" data-model="gemini-3.5-flash">3.5 Flash</button>
      </div>`;
    chatBody.appendChild(wrap);
    chatBody.scrollTop = chatBody.scrollHeight;

    wrap.querySelectorAll(".algobot-retry-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        wrap.remove();
        const chosenModel = btn.dataset.model;
        const typingEl = document.createElement("div");
        typingEl.className = "algobot-msg algobot-msg--bot algobot-typing";
        typingEl.innerText = `⏳ Retrying with ${chosenModel}...`;
        chatBody.appendChild(typingEl);
        chatBody.scrollTop = chatBody.scrollHeight;

        try {
          const res = await fetch("https://algobot-backend.onrender.com/get-hint", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              problem_title: lastTitle,
              code: lastCode,
              user_query: pendingUserQuery,
              history: conversationHistory,
              preferred_model: chosenModel,
            }),
          });
          const data = await res.json();
          typingEl.remove();
          if (data.status === "success") {
            appendMsg("assistant", data.hint);
            conversationHistory.push({ role: "user", content: data.user_message });
            conversationHistory.push({ role: "assistant", content: data.hint });
          } else if (data.status === "overloaded") {
            showChatRetryButtons(lastCode, lastTitle);
          } else {
            appendMsg("assistant", "⚠️ " + (data.hint || "Something went wrong."));
          }
        } catch {
          typingEl.remove();
          appendMsg("assistant", "❌ Can't reach backend.");
        }
      });
    });
  }

  // ── Helper: show retry model buttons in hints ──────────────────────────
  function showHintsRetryButtons(lastCode, lastTitle) {
    hintsIntro.style.display = "flex";
    hintsIntro.innerHTML = `
      <p style="color:#a6adc8;font-size:14px;">⚠️ Model is overloaded. Retry with:</p>
      <div class="algobot-retry-btns">
        <button class="algobot-retry-btn" data-model="gemini-3.7-flash">3.7 Flash</button>
        <button class="algobot-retry-btn" data-model="gemini-3.6-flash">3.6 Flash</button>
        <button class="algobot-retry-btn" data-model="gemini-3.5-flash">3.5 Flash</button>
      </div>`;

    hintsIntro.querySelectorAll(".algobot-retry-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const chosenModel = btn.dataset.model;
        hintsIntro.innerHTML = `<p style="color:#a6adc8">⏳ Retrying with ${chosenModel}...</p>`;
        try {
          const res = await fetch("https://algobot-backend.onrender.com/get-progressive-hints", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ problem_title: lastTitle, code: lastCode, preferred_model: chosenModel }),
          });
          const data = await res.json();
          if (data.status === "success" && data.hints.length === 4) {
            allHints = data.hints;
            hintsRevealed = 0;
            hintsIntro.style.display = "none";
            hintsList.style.display = "flex";
            renderHintCards();
          } else if (data.status === "overloaded") {
            showHintsRetryButtons(lastCode, lastTitle);
          } else {
            hintsIntro.innerHTML = `<p style="color:#f38ba8">⚠️ Failed. Try again.</p>
              <button id="algobot-load-hints-btn">✨ Generate Hints</button>`;
            document.getElementById("algobot-load-hints-btn").addEventListener("click", () =>
              window.postMessage({ type: "ALGOBOT_REQUEST_CODE", mode: "hints" }, "*")
            );
          }
        } catch {
          hintsIntro.innerHTML = `<p style="color:#f38ba8">❌ Can't reach backend.</p>`;
        }
      });
    });
  }

  // ── Clear Chat ────────────────────────────────────────────────────────────
  clearBtn.addEventListener("click", () => {
    conversationHistory = [];
    chatBody.innerHTML = `<div class="algobot-msg algobot-msg--bot">🔄 Chat cleared! Ask me anything.</div>`;
  });

  // ── Send Chat Message ─────────────────────────────────────────────────────
  function triggerSend() {
    if (isChatFetching) return;
    pendingUserQuery = inputField.value.trim() || "Can you give me a hint for my current approach?";
    inputField.value = "";

    appendMsg("user", pendingUserQuery);

    isChatFetching = true;
    sendBtn.disabled = true;
    sendBtn.innerText = "Thinking...";

    const typingEl = document.createElement("div");
    typingEl.className = "algobot-msg algobot-msg--bot algobot-typing";
    typingEl.innerText = "⏳ Analyzing your code...";
    chatBody.appendChild(typingEl);
    chatBody.scrollTop = chatBody.scrollHeight;

    window.postMessage({ type: "ALGOBOT_REQUEST_CODE", mode: "chat" }, "*");
  }

  sendBtn.addEventListener("click", triggerSend);
  inputField.addEventListener("keydown", e => { if (e.key === "Enter") triggerSend(); });

  // ── Generate Progressive Hints ────────────────────────────────────────────
  function renderHintCards() {
    hintsList.innerHTML = "";
    const labels = ["💡 Basic Hint", "🔍 Approach", "⚙️ Implementation", "✅ Full Solution"];
    const colors = ["algobot-hint--basic", "algobot-hint--approach", "algobot-hint--impl", "algobot-hint--solution"];

    allHints.forEach((hint, i) => {
      const card = document.createElement("div");
      card.className = `algobot-hint-card ${colors[i]}`;
      card.dataset.index = i;

      if (i < hintsRevealed) {
        card.classList.add("revealed");
        card.innerHTML = `<div class="algobot-hint-label">${labels[i]}</div><div class="algobot-hint-text">${formatText(hint)}</div>`;
      } else {
        card.innerHTML = `
          <div class="algobot-hint-label">${labels[i]}</div>
          <button class="algobot-reveal-btn" data-index="${i}">
            ${i === 0 ? "Show Hint" : "Reveal Next Hint"}
          </button>`;
        if (i > hintsRevealed) {
          card.classList.add("locked");
        }
      }
      hintsList.appendChild(card);
    });

    // Attach reveal handlers
    hintsList.querySelectorAll(".algobot-reveal-btn").forEach(btn => {
      const idx = parseInt(btn.dataset.index);
      if (idx === hintsRevealed) {
        btn.addEventListener("click", () => {
          hintsRevealed++;
          renderHintCards();
        });
      }
    });
  }

  loadHintsBtn.addEventListener("click", () => {
    if (isHintsFetching) return;
    isHintsFetching = true;
    loadHintsBtn.disabled = true;
    loadHintsBtn.innerText = "Generating...";
    hintsRevealed = 0;
    allHints = [];
    window.postMessage({ type: "ALGOBOT_REQUEST_CODE", mode: "hints" }, "*");
  });

  // ── Message from inject.js ────────────────────────────────────────────────
  window.addEventListener("message", async (event) => {
    if (event.source !== window || event.data.type !== "FROM_ALGOBOT_INJECT") return;

    const liveCode = event.data.text || "";
    const problemTitle = document.title
      .replace(/ - LeetCode$/, "")
      .replace(/ - NeetCode$/, "")
      .trim();

    // ── Handle CHAT mode ──────────────────────────────────────────────────
    if (event.data.mode === "chat" && isChatFetching) {
      const typingEl = chatBody.querySelector(".algobot-typing");
      if (typingEl) typingEl.remove();

      try {
        const res = await fetch("https://algobot-backend.onrender.com/get-hint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problem_title: problemTitle,
            code: liveCode,
            user_query: pendingUserQuery,
            history: conversationHistory,
          }),
        });
        const data = await res.json();
        if (data.status === "success") {
          appendMsg("assistant", data.hint);
          conversationHistory.push({ role: "user", content: data.user_message });
          conversationHistory.push({ role: "assistant", content: data.hint });
        } else if (data.status === "overloaded") {
          showChatRetryButtons(liveCode, problemTitle);
        } else {
          appendMsg("assistant", "⚠️ " + (data.hint || "Something went wrong."));
        }
      } catch {
        appendMsg("assistant", "❌ Can't reach backend. Is `uv run main.py` running?");
      } finally {
        isChatFetching = false;
        sendBtn.disabled = false;
        sendBtn.innerText = "Get Hint";
      }
    }

    // ── Handle HINTS mode ─────────────────────────────────────────────────
    if (event.data.mode === "hints" && isHintsFetching) {
      try {
        const res = await fetch("https://algobot-backend.onrender.com/get-progressive-hints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ problem_title: problemTitle, code: liveCode }),
        });
        const data = await res.json();
        if (data.status === "success" && data.hints.length === 4) {
          allHints = data.hints;
          hintsIntro.style.display = "none";
          hintsList.style.display = "flex";
          renderHintCards();
        } else if (data.status === "overloaded") {
          showHintsRetryButtons(liveCode, problemTitle);
        } else {
          hintsIntro.querySelector("p").innerText = "⚠️ Failed to generate hints. Try again.";
          loadHintsBtn.disabled = false;
          loadHintsBtn.innerText = "✨ Generate Hints";
        }
      } catch {
        hintsIntro.querySelector("p").innerText = "❌ Can't reach backend. Is `uv run main.py` running?";
        loadHintsBtn.disabled = false;
        loadHintsBtn.innerText = "✨ Generate Hints";
      } finally {
        isHintsFetching = false;
      }
    }
  });
}
