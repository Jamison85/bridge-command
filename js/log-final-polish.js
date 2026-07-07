const FINAL_KEYS = {
  completed: "storePilot.completed.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  states: "storePilot.taskStates.v6",
  templates: "storePilot.templates.v7"
};

function finalRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function finalDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function finalShift() {
  return finalRead(FINAL_KEYS.shift, "morning");
}

function finalKey() {
  return `${finalDay()}:${finalShift()}`;
}

function finalData() {
  const shift = finalShift();
  const templates = finalRead(FINAL_KEYS.templates, {});
  const custom = finalRead(FINAL_KEYS.customTasks, {})[finalKey()] || [];
  const tasks = [...(templates[shift] || []), ...custom];
  const done = new Set(finalRead(FINAL_KEYS.completed, {})[finalKey()] || []);
  const states = finalRead(FINAL_KEYS.states, {})[finalKey()] || {};
  const completed = tasks.filter((task) => done.has(task.id));
  const unfinished = tasks.filter((task) => !done.has(task.id));
  const active = unfinished.filter((task) => !states[task.id]);
  const delayed = unfinished.filter((task) => states[task.id]?.type === "delayed");
  const carried = unfinished.filter((task) => states[task.id]?.type === "carry");
  return { shift, tasks, completed, unfinished, active, delayed, carried, states };
}

function urgentText(task, states) {
  return `${task?.title || ""} ${task?.area || ""} ${states[task?.id]?.reason || ""}`.toLowerCase();
}

function isRealUrgent(task, states) {
  return /safety|unsafe|injury|accident|spill|wet floor|power outage|outage|system down|register down|pos down|food safety|temperature|spoiled|cooler down|freezer down|staffing crisis|short staffed|call out|alone|incident report|customer incident|security|police|medical/i.test(urgentText(task, states));
}

function finalStatus(data) {
  if (data.unfinished.some((task) => isRealUrgent(task, data.states))) return "red";
  if (data.unfinished.length || (data.tasks.length && data.completed.length / data.tasks.length < 0.75)) return "yellow";
  return "green";
}

function statusWord(status) {
  return status === "red" ? "Red" : status === "yellow" ? "Yellow" : "Green";
}

function riskWord(status) {
  return status === "red" ? "Red priority" : status === "yellow" ? "Watch" : "Normal";
}

function applyFinalHero(data) {
  const documented = data.delayed.length + data.carried.length;
  if (data.active.length || !documented) return;
  const title = document.querySelector("#next-title");
  const copy = document.querySelector("#next-copy");
  const button = document.querySelector("#complete-next");
  if (title) title.textContent = "Ready for review";
  if (copy) copy.textContent = `${data.completed.length} done, ${documented} documented for handoff.`;
  if (button) {
    button.disabled = false;
    button.textContent = "Review Handoff";
    button.setAttribute("data-state-review", "true");
  }
}

function applyFinalProgress(data) {
  const documented = data.delayed.length + data.carried.length;
  const subtext = document.querySelector("#progress-subtext");
  if (!subtext || !documented) return;
  subtext.textContent = data.active.length
    ? `${data.completed.length} done, ${documented} documented, ${data.active.length} still open.`
    : `${data.completed.length} done, ${documented} documented for handoff.`;
}

function applyFinalContext(data, status) {
  const card = document.querySelector("#context-engine-card");
  if (!card) return;
  card.dataset.risk = status;
  const pill = card.querySelector(".context-risk-pill");
  if (pill) pill.textContent = riskWord(status);
}

function applyFinalBrain(data, status) {
  const logActive = document.querySelector('[data-screen="log"]')?.classList.contains("active");
  const panel = document.querySelector("#smart-handoff-panel");
  if (!logActive || !panel) return;

  const followups = data.delayed.length + data.carried.length + data.active.length;
  const documented = data.delayed.length + data.carried.length;
  panel.classList.add("smart-brain-final-compact");
  panel.dataset.status = status;

  let summary = panel.querySelector(".smart-brain-final-summary");
  if (!summary) {
    summary = document.createElement("p");
    summary.className = "smart-brain-final-summary";
    const head = panel.querySelector(".smart-brain-head");
    head?.insertAdjacentElement("afterend", summary);
  }
  summary.innerHTML = `<strong>${statusWord(status)}</strong> • ${data.completed.length} done • ${documented || followups} documented • Next: Review and send handoff`;

  const store = panel.querySelector(".smart-brain-stat strong");
  if (store) store.textContent = statusWord(status);

  const nextTitle = panel.querySelector("#smart-brain-result .smart-brain-next strong");
  if (nextTitle) nextTitle.textContent = "Review and send handoff";

  const reason = panel.querySelector("#smart-brain-result .smart-brain-next p:last-child");
  if (reason) reason.textContent = "The handoff is drafted. Review it, then use Text / Share or Copy.";

  const statusText = panel.querySelector("#smart-handoff-status");
  if (statusText) statusText.textContent = "Local Shift Brain ready.";
}

function injectFinalStyles() {
  if (document.querySelector("#log-final-polish-styles")) return;
  const style = document.createElement("style");
  style.id = "log-final-polish-styles";
  style.textContent = `.smart-brain-final-compact{padding:18px!important}.smart-brain-final-summary{margin:10px 0 14px!important;font-size:.98rem!important;line-height:1.35!important;color:#14392f!important;-webkit-text-fill-color:#14392f!important}.smart-brain-final-compact .smart-brain-status,.smart-brain-final-compact #smart-brain-result,.smart-brain-final-compact .smart-brain-foot{display:none!important}.smart-brain-final-compact .smart-brain-actions{margin-top:8px!important;grid-template-columns:1fr!important}.smart-brain-final-compact #set-smart-endpoint{display:none!important}`;
  document.head.appendChild(style);
}

function finalPolish() {
  injectFinalStyles();
  const data = finalData();
  const status = finalStatus(data);
  applyFinalHero(data);
  applyFinalProgress(data);
  applyFinalContext(data, status);
  applyFinalBrain(data, status);
}

document.addEventListener("click", () => setTimeout(finalPolish, 160));
document.addEventListener("change", () => setTimeout(finalPolish, 160));
setInterval(finalPolish, 800);
setTimeout(finalPolish, 300);
