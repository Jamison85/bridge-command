function getTaskStateInfo(card) {
  const text = (card.textContent || "").toLowerCase();
  const isDone = card.classList.contains("done");
  const isDelayed = card.classList.contains("delayed") || text.includes("delayed");
  const isCarry = card.classList.contains("carry") || text.includes("carry forward") || text.includes("carried forward");
  const isFollowUp = text.includes("follow up:") || text.includes("follow-up") || text.includes("follow up");
  const needsLoretta = text.includes("loretta");
  const needsRichard = text.includes("richard");
  const isRisk = /safety|wet floor|water|incident|outage|register|system|lock/.test(text);

  if (isDone) return { primaryClass: "state-done", primaryLabel: "Done", extras: [] };
  if (isDelayed) return { primaryClass: "state-delayed", primaryLabel: "Delayed", extras: buildExtras({ needsLoretta, needsRichard, isRisk, isFollowUp }) };
  if (isCarry) return { primaryClass: "state-carry", primaryLabel: "Carry Forward", extras: buildExtras({ needsLoretta, needsRichard, isRisk, isFollowUp }) };
  if (isFollowUp) return { primaryClass: "state-follow-up", primaryLabel: "Follow-up", extras: buildExtras({ needsLoretta, needsRichard, isRisk }) };
  return { primaryClass: "state-open", primaryLabel: "Open", extras: buildExtras({ needsLoretta, needsRichard, isRisk }) };
}

function buildExtras({ needsLoretta, needsRichard, isRisk, isFollowUp }) {
  const extras = [];
  if (needsLoretta) extras.push({ className: "state-leadership", label: "Needs Loretta" });
  if (needsRichard) extras.push({ className: "state-leadership", label: "Needs Richard" });
  if (isRisk) extras.push({ className: "state-risk", label: "Risk" });
  if (isFollowUp) extras.push({ className: "state-follow-up", label: "Follow-up" });
  return extras;
}

function clearStateClasses(card) {
  [
    "state-open",
    "state-done",
    "state-delayed",
    "state-carry",
    "state-follow-up",
    "state-leadership",
    "state-risk"
  ].forEach((className) => card.classList.remove(className));
}

function pillHTML(className, label) {
  return `<span class="state-pill ${className}">${label}</span>`;
}

function addStateSummary(card) {
  if (card.closest("#next-brain-explain")) return;
  clearStateClasses(card);
  const state = getTaskStateInfo(card);
  card.classList.add(state.primaryClass);
  if (state.extras.some((extra) => extra.className === "state-leadership")) card.classList.add("state-leadership");
  if (state.extras.some((extra) => extra.className === "state-risk")) card.classList.add("state-risk");

  const content = card.classList.contains("walk-card")
    ? card.querySelector(".screen-header > div")
    : card.querySelector(".task-title")?.parentElement;
  if (!content) return;

  let summary = content.querySelector(":scope > .task-state-summary");
  if (!summary) {
    summary = document.createElement("div");
    summary.className = "task-state-summary";
    content.appendChild(summary);
  }

  const extras = state.extras.map((extra) => pillHTML(extra.className, extra.label)).join("");
  summary.innerHTML = `${pillHTML(state.primaryClass, state.primaryLabel)}${extras}`;
}

function enhanceTaskStates() {
  document.querySelectorAll(".task-row, .walk-card").forEach(addStateSummary);
}

document.addEventListener("click", () => setTimeout(enhanceTaskStates, 80));
document.addEventListener("change", () => setTimeout(enhanceTaskStates, 80));
setInterval(enhanceTaskStates, 1000);
setTimeout(enhanceTaskStates, 120);
