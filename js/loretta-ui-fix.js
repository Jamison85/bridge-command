const LORETTA_STYLE_ID = "loretta-consistency-style";
let fixedRecognition = null;
let speechBaseText = "";

function ensureLorettaStyle() {
  if (document.querySelector(`#${LORETTA_STYLE_ID}`)) return;
  const link = document.createElement("link");
  link.id = LORETTA_STYLE_ID;
  link.rel = "stylesheet";
  link.href = "./css/loretta-consistency.css?v=command-center-3";
  document.head.appendChild(link);
  document.documentElement.classList.add("loretta-ui-ready");
}

function normalizeSpeech(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeUniqueSpeech(existing, incoming) {
  const left = String(existing || "").trim();
  const right = String(incoming || "").trim();
  if (!right) return left;
  if (!left) return right;

  const leftNormalized = normalizeSpeech(left);
  const rightNormalized = normalizeSpeech(right);
  if (!rightNormalized || leftNormalized === rightNormalized || leftNormalized.endsWith(rightNormalized)) return left;
  if (rightNormalized.startsWith(leftNormalized)) return right;

  const leftWords = left.split(/\s+/);
  const rightWords = right.split(/\s+/);
  const leftCompare = leftWords.map(normalizeSpeech);
  const rightCompare = rightWords.map(normalizeSpeech);
  const maxOverlap = Math.min(leftWords.length, rightWords.length, 18);
  let overlap = 0;

  for (let size = maxOverlap; size > 0; size -= 1) {
    const leftTail = leftCompare.slice(-size).join(" ");
    const rightHead = rightCompare.slice(0, size).join(" ");
    if (leftTail && leftTail === rightHead) {
      overlap = size;
      break;
    }
  }

  const remainder = rightWords.slice(overlap).join(" ").trim();
  return remainder ? `${left} ${remainder}`.trim() : left;
}

function transcriptFromEvent(event) {
  let finalText = "";
  let interimText = "";

  for (let index = 0; index < event.results.length; index += 1) {
    const result = event.results[index];
    const transcript = result?.[0]?.transcript?.trim() || "";
    if (!transcript) continue;
    if (result.isFinal) finalText = mergeUniqueSpeech(finalText, transcript);
    else interimText = mergeUniqueSpeech(interimText, transcript);
  }

  return mergeUniqueSpeech(finalText, interimText);
}

function updateSpeechField(textarea, spokenText) {
  if (!textarea) return;
  const spoken = String(spokenText || "").trim();
  textarea.value = [speechBaseText, spoken].filter(Boolean).join("\n");
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function setMicState(button, listening) {
  if (!button) return;
  button.textContent = listening ? "Stop Mic" : "Start Mic";
  button.classList.toggle("listening", listening);
  button.setAttribute("aria-pressed", String(listening));
}

function setMicStatus(text) {
  const status = document.querySelector("#system-status");
  if (!status) return;
  status.textContent = text;
  clearTimeout(setMicStatus.timer);
  setMicStatus.timer = setTimeout(() => { status.textContent = "Ready"; }, 2200);
}

function stopFixedRecognition() {
  const recognition = fixedRecognition;
  fixedRecognition = null;
  recognition?.stop?.();
}

function startFixedRecognition(button) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const textarea = document.querySelector("#loretta-capture-text");

  if (!SpeechRecognition) {
    setMicStatus("Use keyboard microphone");
    textarea?.focus();
    return;
  }

  if (fixedRecognition) {
    stopFixedRecognition();
    return;
  }

  speechBaseText = textarea?.value.trim() || "";
  const recognition = new SpeechRecognition();
  fixedRecognition = recognition;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.lang = "en-US";

  recognition.onstart = () => {
    setMicState(button, true);
    setMicStatus("Listening");
  };

  recognition.onresult = (event) => {
    updateSpeechField(textarea, transcriptFromEvent(event));
  };

  recognition.onerror = (event) => {
    if (event.error !== "aborted" && event.error !== "no-speech") setMicStatus("Mic stopped");
  };

  recognition.onend = () => {
    if (fixedRecognition === recognition) fixedRecognition = null;
    setMicState(button, false);
    setMicStatus("Speech captured");
  };

  recognition.start();
}

function interceptLorettaMic(event) {
  const button = event.target.closest("[data-capture-mic]");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  startFixedRecognition(button);
}

function stopMicWhenSheetCloses(event) {
  if (!event.target.closest("[data-capture-close]") && event.target.id !== "loretta-capture-sheet") return;
  stopFixedRecognition();
}

ensureLorettaStyle();
document.addEventListener("click", interceptLorettaMic, true);
document.addEventListener("click", stopMicWhenSheetCloses, true);
window.addEventListener("pagehide", stopFixedRecognition);
document.addEventListener("visibilitychange", () => { if (document.hidden) stopFixedRecognition(); });
