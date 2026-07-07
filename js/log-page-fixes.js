const LOG_FIX_SHIFT_KEY = "storePilot.shift.v6";
const LOG_FIX_SHIFT_NAMES = { morning: "Morning", mid: "Mid", close: "Close" };
const LOG_FIX_SHIFT_IDS = Object.keys(LOG_FIX_SHIFT_NAMES);
let lastReviewRebuildShift = "";

function logFixRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function logFixWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function logFixActiveShift() {
  const activeButtonShift = document.querySelector(".shift-button.active")?.dataset?.shift;
  if (LOG_FIX_SHIFT_IDS.includes(activeButtonShift)) return activeButtonShift;

  const heroLabel = document.querySelector("#shift-label")?.textContent?.trim().toLowerCase();
  const labelShift = LOG_FIX_SHIFT_IDS.find((shift) => LOG_FIX_SHIFT_NAMES[shift].toLowerCase() === heroLabel);
  if (labelShift) return labelShift;

  const stored = logFixRead(LOG_FIX_SHIFT_KEY, "morning");
  return LOG_FIX_SHIFT_IDS.includes(stored) ? stored : "morning";
}

function syncShiftStorage(shift = logFixActiveShift()) {
  if (!LOG_FIX_SHIFT_IDS.includes(shift)) return;
  if (logFixRead(LOG_FIX_SHIFT_KEY, "morning") !== shift) logFixWrite(LOG_FIX_SHIFT_KEY, shift);
  document.documentElement.dataset.storePilotActiveShift = shift;
}

function syncVisibleShiftLabels() {
  const shift = logFixActiveShift();
  syncShiftStorage(shift);
  const label = LOG_FIX_SHIFT_NAMES[shift] || "Shift";

  const heroLabel = document.querySelector("#shift-label");
  if (heroLabel) heroLabel.textContent = label;

  const contextStrong = document.querySelector("#context-engine-card .context-compact-row strong");
  if (contextStrong) {
    const mode = contextStrong.textContent.split("•").slice(1).join("•").trim() || "Normal";
    contextStrong.textContent = `${label} • ${mode}`;
  }

  const reviewBadge = document.querySelector(".review-card > .screen-header .badge");
  if (reviewBadge && LOG_FIX_SHIFT_IDS.some((id) => reviewBadge.textContent.trim() === LOG_FIX_SHIFT_NAMES[id])) reviewBadge.textContent = label;

  const brainTitle = document.querySelector("#smart-handoff-panel .smart-brain-title h4");
  if (brainTitle) brainTitle.textContent = `${label} command read`;
}

function maybeRebuildReviewForShift() {
  const logActive = document.querySelector('[data-screen="log"]')?.classList.contains("active");
  if (!logActive) return false;

  const shift = logFixActiveShift();
  const expected = LOG_FIX_SHIFT_NAMES[shift];
  const badge = document.querySelector(".review-card > .screen-header .badge");
  const refresh = document.querySelector("#refresh-review");
  if (!badge || !refresh) return false;

  const actual = badge.textContent.trim();
  if (actual && actual !== expected && lastReviewRebuildShift !== shift) {
    lastReviewRebuildShift = shift;
    refresh.click();
    setTimeout(() => {
      syncVisibleShiftLabels();
      improveLogLayout();
    }, 90);
    return true;
  }
  return false;
}

function moveSectionBefore(card, section, before) {
  if (!card || !section || !before || section === before || section.nextElementSibling === before) return;
  card.insertBefore(section, before);
}

function simplifyHandoffOptions(options) {
  if (!options) return;
  const helperText = options.querySelector(".helper-text");
  if (helperText) helperText.textContent = "Choose who gets the handoff and the tone. New Message Version keeps the facts and changes the wording.";

  const proofText = [...options.querySelectorAll(".helper-text")][1];
  if (proofText) proofText.classList.add("handoff-proof-line");

  const status = options.querySelector("#smart-handoff-status");
  if (status && /API is optional/i.test(status.textContent)) status.textContent = "Local Shift Brain ready.";

  options.querySelector("#set-smart-endpoint")?.remove();
  const foot = options.querySelector(".smart-brain-foot");
  if (foot) foot.textContent = "Rewrites the handoff using only the actual task status.";
}

function improveLogLayout() {
  syncVisibleShiftLabels();
  if (maybeRebuildReviewForShift()) return;

  const logActive = document.querySelector('[data-screen="log"]')?.classList.contains("active");
  if (!logActive) return;

  const card = document.querySelector(".review-card");
  if (!card) return;

  const options = card.querySelector(".handoff-options");
  const messageSection = card.querySelector("#review-message")?.closest(".review-section");
  const firstListSection = [...card.querySelectorAll(":scope > .review-section")]
    .find((section) => !section.classList.contains("handoff-options") && !section.querySelector("#review-message"));

  if (messageSection) {
    messageSection.classList.add("review-message-section");
    if (options) moveSectionBefore(card, messageSection, options);
    else if (firstListSection) moveSectionBefore(card, messageSection, firstListSection);
  }

  if (options && firstListSection) moveSectionBefore(card, options, firstListSection);
  simplifyHandoffOptions(options);

  const refresh = card.querySelector("#refresh-review");
  if (refresh) refresh.textContent = "New Message Version";

  const copy = card.querySelector("#copy-review");
  if (copy) {
    copy.hidden = false;
    copy.disabled = false;
    copy.textContent = "Copy";
  }

  const textarea = card.querySelector("#review-message");
  if (textarea && !textarea.dataset.keyboardSafeBound) {
    textarea.dataset.keyboardSafeBound = "true";
    textarea.addEventListener("focus", () => {
      setTimeout(() => textarea.closest(".review-message-section")?.scrollIntoView({ block: "center", behavior: "smooth" }), 260);
    });
  }

  card.classList.add("log-layout-fixed");
}

function applyLogPageFixes() {
  syncVisibleShiftLabels();
  improveLogLayout();
}

document.addEventListener("click", (event) => {
  const shiftButton = event.target.closest?.(".shift-button");
  if (shiftButton?.dataset?.shift) {
    syncShiftStorage(shiftButton.dataset.shift);
    lastReviewRebuildShift = "";
  }
}, true);

document.addEventListener("click", () => setTimeout(applyLogPageFixes, 90));
document.addEventListener("change", () => setTimeout(applyLogPageFixes, 90));
document.addEventListener("input", (event) => {
  if (event.target?.matches?.("#review-message")) document.querySelector(".review-message-section")?.classList.add("is-editing");
});

setInterval(applyLogPageFixes, 700);
setTimeout(applyLogPageFixes, 180);
