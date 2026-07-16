const HANDOFF_TASK_RELEASE = "command-center-21";
const HANDOFF_KEYS = {
  templates: "storePilot.templates.v7",
  completed: "storePilot.completed.v6",
  states: "storePilot.taskStates.v6"
};
const HANDOFF_TASK_IDS = new Set(["shift-note", "handoff-mid", "handoff-close"]);

let handoffCleanupRunning = false;
let handoffCleanupQueued = false;

function handoffRead(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function isObjectMap(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function isHandoffTemplateTask(task) {
  if (!task || typeof task !== "object") return false;
  const id = String(task.id || "").toLowerCase();
  const title = String(task.title || "").toLowerCase();
  const area = String(task.area || "").toLowerCase();

  if (HANDOFF_TASK_IDS.has(id)) return true;
  return title.includes("handoff") && (title.includes("note") || area === "closeout");
}

function cleanShiftTasks(tasks) {
  if (!Array.isArray(tasks)) return { tasks, removed: [] };
  const removed = tasks.filter(isHandoffTemplateTask);
  const kept = tasks
    .filter((task) => !isHandoffTemplateTask(task))
    .map((task, index) => ({ ...task, priority: index + 1 }));
  return { tasks: kept, removed };
}

function cleanCompletedRecords(taskIds) {
  const completed = handoffRead(HANDOFF_KEYS.completed, {});
  if (!isObjectMap(completed)) return false;
  let changed = false;
  const next = { ...completed };

  Object.entries(next).forEach(([shiftKey, ids]) => {
    if (!Array.isArray(ids)) return;
    const kept = ids.filter((id) => !taskIds.has(String(id || "")));
    if (kept.length !== ids.length) {
      next[shiftKey] = kept;
      changed = true;
    }
  });

  if (changed) localStorage.setItem(HANDOFF_KEYS.completed, JSON.stringify(next));
  return changed;
}

function cleanTaskStateRecords(taskIds) {
  const states = handoffRead(HANDOFF_KEYS.states, {});
  if (!isObjectMap(states)) return false;
  let changed = false;
  const next = { ...states };

  Object.entries(next).forEach(([shiftKey, shiftStates]) => {
    if (!isObjectMap(shiftStates)) return;
    const cleaned = { ...shiftStates };
    taskIds.forEach((id) => {
      if (Object.prototype.hasOwnProperty.call(cleaned, id)) {
        delete cleaned[id];
        changed = true;
      }
    });
    next[shiftKey] = cleaned;
  });

  if (changed) localStorage.setItem(HANDOFF_KEYS.states, JSON.stringify(next));
  return changed;
}

function refreshTaskViews() {
  window.StorePilotCommandCenter?.render?.();
  const activeShift = document.querySelector(".shift-button.active");
  if (activeShift) setTimeout(() => activeShift.click(), 0);
}

function removeHandoffTasks({ refresh = true } = {}) {
  if (handoffCleanupRunning) return [];
  handoffCleanupRunning = true;
  try {
    const templates = handoffRead(HANDOFF_KEYS.templates, null);
    if (!isObjectMap(templates)) return [];

    const next = { ...templates };
    const removed = [];
    let templateChanged = false;

    Object.keys(next).forEach((shift) => {
      const result = cleanShiftTasks(next[shift]);
      if (result.removed.length) {
        next[shift] = result.tasks;
        removed.push(...result.removed.map((task) => ({ shift, id: task.id, title: task.title })));
        templateChanged = true;
      }
    });

    if (templateChanged) localStorage.setItem(HANDOFF_KEYS.templates, JSON.stringify(next));

    const removedIds = new Set(HANDOFF_TASK_IDS);
    removed.forEach((task) => removedIds.add(String(task.id || "")));
    const completedChanged = cleanCompletedRecords(removedIds);
    const statesChanged = cleanTaskStateRecords(removedIds);
    const changed = templateChanged || completedChanged || statesChanged;

    if (!changed) return [];
    window.dispatchEvent(new CustomEvent("storepilot:handoff-tasks-removed", { detail: { removed } }));
    if (refresh) refreshTaskViews();
    return removed;
  } finally {
    handoffCleanupRunning = false;
  }
}

function queueHandoffCleanup() {
  if (handoffCleanupQueued) return;
  handoffCleanupQueued = true;
  setTimeout(() => {
    handoffCleanupQueued = false;
    removeHandoffTasks();
  }, 40);
}

function startHandoffCleanup() {
  removeHandoffTasks({ refresh: false });
  setTimeout(refreshTaskViews, 80);

  window.addEventListener("storepilot:templates-changed", queueHandoffCleanup);
  window.addEventListener("storage", (event) => {
    if (!event.key || Object.values(HANDOFF_KEYS).includes(event.key)) queueHandoffCleanup();
  });
  window.addEventListener("focus", queueHandoffCleanup);

  document.addEventListener("click", (event) => {
    if (event.target.closest(".icon-button, .template-card, [data-template], [data-shift]")) queueHandoffCleanup();
  });
}

window.StorePilotHandoffTaskCleanup = {
  version: HANDOFF_TASK_RELEASE,
  run: removeHandoffTasks,
  isHandoffTask: isHandoffTemplateTask
};

document.documentElement.dataset.handoffTaskCleanup = HANDOFF_TASK_RELEASE;
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startHandoffCleanup, { once: true });
else startHandoffCleanup();
