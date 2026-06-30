const STATE_KEYS = {
  completed: "storePilot.completed.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  taskStates: "storePilot.taskStates.v6",
  templates: "storePilot.templates.v7"
};

function stateRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function stateDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function stateShift() {
  return stateRead(STATE_KEYS.shift, "morning");
}

function stateShiftKey() {
  return `${stateDateKey()}:${stateShift()}`;
}

function stateTasks() {
  const templates = stateRead(STATE_KEYS.templates, {});
  const custom = stateRead(STATE_KEYS.customTasks, {})[stateShiftKey()] || [];
  return [...(templates[stateShift()] || []), ...custom];
}

function stateCompleted() {
  return stateRead(STATE_KEYS.completed, {})[stateShiftKey()] || [];
}

function stateMap() {
  return stateRead(STATE_KEYS.taskStates, {})[stateShiftKey()] || {};
}

function stateCounts() {
  const done = new Set(stateCompleted());
  const states = stateMap();
  const tasks = stateTasks();
  const active = tasks.filter((task) => !done.has(task.id) && !states[task.id]);
  const followups = tasks.filter((task) => !done.has(task.id) && states[task.id]);
  return { active, followups };
}

function openReview() {
  document.querySelector('[data-screen="log"]')?.click();
}

function openTasks() {
  document.querySelector('[data-screen="tasks"]')?.click();
}

function polishNoActiveState() {
  const { active, followups } = stateCounts();
  if (active.length) return;

  const title = document.querySelector("#next-title");
  const copy = document.querySelector("#next-copy");
  const start = document.querySelector("#complete-next");
  if (title && copy && start) {
    title.textContent = "Ready for review";
    copy.textContent = followups.length
      ? `${followups.length} follow-up item${followups.length === 1 ? " is" : "s are"} documented for handoff.`
      : "The active task list is handled for this shift.";
    start.disabled = false;
    start.textContent = "Review Handoff";
    start.setAttribute("data-state-review", "true");
  }

  const screenTitle = document.querySelector("#screen-title")?.textContent || "";
  const content = document.querySelector("#screen-content");
  if (!content || !screenTitle.toLowerCase().includes("next")) return;
  if (!content.textContent.includes("No active task waiting")) return;

  const count = followups.length;
  content.innerHTML = `<div class="empty-state followup-empty"><strong>No active task waiting.</strong><p>${count} item${count === 1 ? " is" : "s are"} documented for the End-of-Day Review.</p><div class="empty-state-actions"><button class="primary-action" type="button" data-state-open-review>Open Review</button><button class="secondary-action" type="button" data-state-open-tasks>View Tasks</button></div></div>`;
}

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-state-review]") || event.target.closest("[data-state-open-review]")) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openReview();
    return;
  }
  if (event.target.closest("[data-state-open-tasks]")) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openTasks();
    return;
  }
  setTimeout(polishNoActiveState, 60);
}, true);

document.addEventListener("change", () => setTimeout(polishNoActiveState, 60));
setInterval(polishNoActiveState, 650);
setTimeout(polishNoActiveState, 140);
