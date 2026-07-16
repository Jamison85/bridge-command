const HANDOFF_TASK_RELEASE = "command-center-21";
const HANDOFF_TEMPLATE_KEY = "storePilot.templates.v7";
const HANDOFF_TASK_IDS = new Set(["shift-note", "handoff-mid", "handoff-close"]);

let handoffCleanupRunning = false;
let handoffCleanupQueued = false;

function handoffReadTemplates() {
  try {
    const value = JSON.parse(localStorage.getItem(HANDOFF_TEMPLATE_KEY));
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
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

function refreshTaskViews() {
  window.StorePilotCommandCenter?.render?.();
  const activeShift = document.querySelector(".shift-button.active");
  if (activeShift) setTimeout(() => activeShift.click(), 0);
}

function removeHandoffTasks({ refresh = true } = {}) {
  if (handoffCleanupRunning) return [];
  handoffCleanupRunning = true;
  try {
    const templates = handoffReadTemplates();
    if (!templates) return [];

    const next = { ...templates };
    const removed = [];
    let changed = false;

    Object.keys(next).forEach((shift) => {
      const result = cleanShiftTasks(next[shift]);
      if (result.removed.length) {
        next[shift] = result.tasks;
        removed.push(...result.removed.map((task) => ({ shift, id: task.id, title: task.title })));
        changed = true;
      }
    });

    if (!changed) return [];
    localStorage.setItem(HANDOFF_TEMPLATE_KEY, JSON.stringify(next));
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
    if (!event.key || event.key === HANDOFF_TEMPLATE_KEY) queueHandoffCleanup();
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
