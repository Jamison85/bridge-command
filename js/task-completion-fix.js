const TASK_COMPLETION_KEYS = {
  completed: "storePilot.completed.v6",
  states: "storePilot.taskStates.v6",
  shift: "storePilot.shift.v6"
};

let taskCompletionLocked = false;

function completionRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function completionWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function completionDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function completionShiftKey() {
  const analysis = window.StorePilotCommandCenter?.analyze?.();
  if (analysis?.data?.key) return analysis.data.key;
  const shift = completionRead(TASK_COMPLETION_KEYS.shift, "morning");
  return `${completionDateKey()}:${shift}`;
}

function normalizedTaskTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function setCompletionStatus(text) {
  const status = document.querySelector("#system-status");
  if (!status) return;
  status.textContent = text;
  clearTimeout(setCompletionStatus.timer);
  setCompletionStatus.timer = setTimeout(() => { status.textContent = "Ready"; }, 2200);
}

function rerenderAfterCompletion() {
  const nextTab = document.querySelector('[data-screen="next"]');
  if (nextTab) nextTab.click();
  requestAnimationFrame(() => window.StorePilotCommandCenter?.render?.());
  setTimeout(() => window.StorePilotCommandCenter?.render?.(), 80);
}

function completeRankedTask(button) {
  if (taskCompletionLocked) return;
  const analysis = window.StorePilotCommandCenter?.analyze?.();
  const task = analysis?.next;
  if (!task) {
    setCompletionStatus("No open task");
    return;
  }

  if (/walk/i.test(`${task.area || ""} ${task.title || ""}`)) {
    document.querySelector('[data-screen="tasks"]')?.click();
    return;
  }

  taskCompletionLocked = true;
  const key = analysis?.data?.key || completionShiftKey();
  const completedStore = completionRead(TASK_COMPLETION_KEYS.completed, {});
  const completed = new Set(completedStore[key] || []);
  const targetTitle = normalizedTaskTitle(task.title);
  const tasks = Array.isArray(analysis?.data?.tasks) ? analysis.data.tasks : [task];
  const matches = tasks.filter((item) => !completed.has(item.id) && normalizedTaskTitle(item.title) === targetTitle);
  const ids = (matches.length ? matches : [task]).map((item) => item.id);

  ids.forEach((id) => completed.add(id));
  completedStore[key] = [...completed];
  completionWrite(TASK_COMPLETION_KEYS.completed, completedStore);

  const stateStore = completionRead(TASK_COMPLETION_KEYS.states, {});
  const shiftStates = { ...(stateStore[key] || {}) };
  ids.forEach((id) => delete shiftStates[id]);
  stateStore[key] = shiftStates;
  completionWrite(TASK_COMPLETION_KEYS.states, stateStore);

  if (button) {
    button.textContent = "Done ✓";
    button.disabled = true;
    button.classList.add("task-completion-confirmed");
  }

  setCompletionStatus(ids.length > 1 ? `${ids.length} matching tasks marked done` : "Marked done");
  window.dispatchEvent(new CustomEvent("storepilot:tasks-changed", { detail: { shiftKey: key, taskIds: ids } }));

  setTimeout(() => {
    rerenderAfterCompletion();
    taskCompletionLocked = false;
  }, 120);
}

function handleHeroCompletion(event) {
  const button = event.target.closest?.("#complete-next");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  completeRankedTask(button);
}

document.addEventListener("click", handleHeroCompletion, true);
window.StorePilotTaskCompletion = {
  completeCurrent: () => completeRankedTask(document.querySelector("#complete-next")),
  normalizeTitle: normalizedTaskTitle
};
