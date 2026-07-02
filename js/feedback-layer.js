const FEEDBACK_HIDE_DELAY = 4200;
const FEEDBACK_QUIET_MESSAGES = new Set(["", "ready"]);
let feedbackTimer = null;
let lastFeedback = "";

function ensureFeedbackBanner() {
  let banner = document.querySelector("#feedback-banner");
  if (banner) return banner;

  banner = document.createElement("div");
  banner.id = "feedback-banner";
  banner.className = "feedback-banner";
  banner.setAttribute("role", "status");
  banner.setAttribute("aria-live", "polite");
  banner.innerHTML = "<span></span>";

  const shiftCard = document.querySelector(".shift-card");
  if (shiftCard?.parentElement) shiftCard.parentElement.insertBefore(banner, shiftCard.nextSibling);
  else document.querySelector(".app-shell")?.prepend(banner);

  return banner;
}

function classifyFeedback(message) {
  const text = message.toLowerCase();
  if (/delay|delayed|failed|nothing|outage|incident|risk|error|short staffed/.test(text)) return "feedback-warn";
  if (/carry|copied|listening|speech|endpoint|api|shift/.test(text)) return "feedback-info";
  return "feedback-good";
}

function detailForFeedback(message) {
  const text = message.toLowerCase();
  if (/walk complete|follow-up/.test(text)) return "Tasks were updated. Check the list before moving on.";
  if (/carried forward|carry/.test(text)) return "This item was moved into a later shift window.";
  if (/delayed/.test(text)) return "The reason was saved so the handoff has context.";
  if (/report saved/.test(text)) return "The report was saved into Log.";
  if (/task added/.test(text)) return "The new task is now in the active task list.";
  if (/copied/.test(text)) return "Ready to paste into a text or message thread.";
  return "Saved in Store Pilot.";
}

function showFeedback(message) {
  const clean = String(message || "").trim();
  if (FEEDBACK_QUIET_MESSAGES.has(clean.toLowerCase())) return;
  if (clean === lastFeedback) return;
  lastFeedback = clean;

  const banner = ensureFeedbackBanner();
  banner.classList.remove("feedback-good", "feedback-warn", "feedback-info", "visible");
  banner.classList.add(classifyFeedback(clean), "visible");
  banner.innerHTML = `<span>${escapeFeedback(clean)}<small>${escapeFeedback(detailForFeedback(clean))}</small></span>`;

  clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => {
    banner.classList.remove("visible");
    lastFeedback = "";
  }, FEEDBACK_HIDE_DELAY);
}

function watchStatusPill() {
  const status = document.querySelector("#system-status");
  if (!status || status.dataset.feedbackWatched === "yes") return;
  status.dataset.feedbackWatched = "yes";
  const observer = new MutationObserver(() => showFeedback(status.textContent));
  observer.observe(status, { childList: true, characterData: true, subtree: true });
}

function escapeFeedback(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

watchStatusPill();
document.addEventListener("click", () => setTimeout(watchStatusPill, 80));
document.addEventListener("change", () => setTimeout(watchStatusPill, 80));
setTimeout(watchStatusPill, 200);
