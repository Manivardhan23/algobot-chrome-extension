console.log("⚡ AlgoBot inject.js loaded into page context");

window.addEventListener("message", (event) => {
  if (event.source !== window || event.data.type !== "ALGOBOT_REQUEST_CODE") {
    return;
  }
  const mode = event.data.mode || "chat";

  console.log("📥 AlgoBot received extraction request");
  let extractedCode = "";

  try {
    // 1. Try Monaco API (For the Old LeetCode UI)
    if (window.monaco && window.monaco.editor) {
      const models = window.monaco.editor.getModels();
      if (models.length > 0) {
        for (const model of models) {
          const val = model.getValue();
          if (val && val.trim().length > 0) {
            extractedCode = val;
            break;
          }
        }
      }
    }

    // 2. Fallback A: Scrape Monaco DOM lines (Intermediate UI)
    if (!extractedCode) {
      const monacoLines = document.querySelectorAll(".view-line");
      if (monacoLines.length > 0) {
        extractedCode = Array.from(monacoLines)
          .map((line) => line.textContent)
          .join("\n");
      }
    }

    // 3. Fallback B: Scrape CodeMirror DOM lines (New LeetCode UI)
    if (!extractedCode) {
      const cmLines = document.querySelectorAll(".cm-line");
      if (cmLines.length > 0) {
        extractedCode = Array.from(cmLines)
          // LeetCode sometimes uses zero-width spaces for formatting, we strip them out
          .map((line) => line.textContent.replace(/\u200B/g, ""))
          .join("\n");
      }
    }

    console.log("📤 AlgoBot extracted code length:", extractedCode.length);
    window.postMessage(
      { type: "FROM_ALGOBOT_INJECT", text: extractedCode, mode: mode },
      "*"
    );
  } catch (error) {
    console.error("AlgoBot extraction error:", error);
    window.postMessage({ type: "FROM_ALGOBOT_INJECT", text: "", mode: mode }, "*");
  }
});
