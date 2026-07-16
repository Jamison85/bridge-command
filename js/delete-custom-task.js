const CUSTOM_DELETE_RELEASE = "command-center-22";
const CUSTOM_DELETE_KEYS = {
  customTasks: "storePilot.customTasks.v6",
  completed: "storePilot.completed.v6",
  states: "storePilot.taskStates.v6",
  checklists: "storePilot.taskChecklists.v1",
  shift: "storePilot.shift.v6"
};

let customDeleteObserver = null;
let customDeleteQueued = false;
let customDeleteRunning = false;

function customDeleteRead(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function customDeleteWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function customDeleteDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function customDeleteShift() {
  const shift = customDeleteRead(CUSTOM_DELETE_KEYS.shift, "morning");
  return ["morning", "mid", "close"].includes(shift) ? shift : "morning";
}

function customDeleteShiftKey() {
  return `${customDeleteDateKey()}:${customDeleteShift()}`;
}

function isObjectMap(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function currentCustomTasks() {
  const all = customDeleteRead(CUSTOM_DELETE_KEYS.customTasks, {});
  const tasks = isObjectMap(all) ? all[customDeleteShiftKey()] : [];
  return Array.isArray(tasks) ? tasks : [];
}

function currentCustomTaskMap() {
  return new Map(currentCustomTasks().map((task) => [String(task?.id || ""), task]));
}

function tasksScreenIsActive() {
  return document.querySelector('[data-screen="tasks"]')?.classList.contains("active") === true
    || document.querySelector("#screen-title")?.textContent?.trim() === "Tasks";
}

function rowTaskId(row) {
  return String(row.querySelector("[data-task]")?.dataset.task || "");
}

function deleteButtonHTML(taskId) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mini-button subtle custom-task-delete";
  button.dataset.deleteCustomTask = taskId;
  button.textContent = "Delete";
  button.setAttribute("aria-label", "Delete this added task");
  return button;
}

function ensureTaskActionGroup(row) {
  const existingGroup = row.querySelector(":scope > .task-actions, :scope > .action-row");
  if (existingGroup) return existingGroup;

  const existingAction = row.querySelector(":scope > button[data-task-action]");
  if (!existingAction) return null;

  const group = document.createElement("div");
  group.className = "task-actions custom-task-action-group";
  existingAction.before(group);
  group.appendChild(existingAction);
  return group;
}

function enhanceCustomTaskRows() {
  if (!tasksScreenIsActive()) return;
  const customTasks = currentCustomTaskMap();
  if (!customTasks.size) return;

  document.querySelectorAll("#screen-content .task-row, #screen-content .walk-card").forEach((row) => {
    const taskId = rowTaskId(row);
    if (!taskId || !customTasks.has(taskId)) return;
    if (row.querySelector(`[data-delete-custom-task="${CSS.escape(taskId)}"]`)) return;

    const group = ensureTaskActionGroup(row);
    if (!group) return;
    row.classList.add("custom-task-row");
    group.appendChild(deleteButtonHTML(taskId));
  });
}

function removeIdFromCompleted(taskId, shiftKey) {
  const all = customDeleteRead(CUSTOM_DELETE_KEYS.completed, {});
  if (!isObjectMap(all) || !Array.isArray(all[shiftKey])) return;
  const filtered = all[shiftKey].filter((id) => String(id || "") !== taskId);
  if (filtered.length === all[shiftKey].length) return;
  if (filtered.length) all[shiftKey] = filtered;
  else delete all[shiftKey];
  customDeleteWrite(CUSTOM_DELETE_KEYS.completed, all);
}

function removeIdFromMapStore(storageKey, taskId, shiftKey) {
  const all = customDeleteRead(storageKey, {});
  if (!isObjectMap(all) || !isObjectMap(all[shiftKey]) || !Object.prototype.hasOwnProperty.call(all[shiftKey], taskId)) return;
  const shiftValues = { ...all[shiftKey] };
  delete shiftValues[taskId];
  if (Object.keys(shiftValues).length) all[shiftKey] = shiftValues;
  else delete all[shiftKey];
  customDeleteWrite(storageKey, all);
}

function setCustomDeleteStatus(text) {
  const status = document.querySelector("#system-status");
  if (!status) return;
  status.textContent = text;
  clearTimeout(setCustomDeleteStatus.timer);
  setCustomDeleteStatus.timer = setTimeout(() => {
    status.textContent = "Ready";
  }, 2400);
}

function refreshAfterCustomDelete(taskId, shiftKey) {
  window.dispatchEvent(new CustomEvent("storepilot:tasks-changed", {
    detail: { shiftKey, taskIds: [taskId], deleted: true }
  }));
  window.StorePilotCommandCenter?.render?.();
  setTimeout(() => {
    document.querySelector('[data-screen="tasks"]')?.click();
    queueCustomDeleteEnhance();
  }, 0);
}

function deleteCustomTask(taskId, { confirmDelete = true } = {}) {
  if (customDeleteRunning) return false;
  const shiftKey = customDeleteShiftKey();
  const all = customDeleteRead(CUSTOM_DELETE_KEYS.customTasks, {});
  if (!isObjectMap(all) || !Array.isArray(all[shiftKey])) return false;

  const task = all[shiftKey].find((item) => String(item?.id || "") === taskId);
  if (!task) return false;

  if (confirmDelete && !window.confirm(`Delete “${String(task.title || "this task")}” from this shift?\n\nThis cannot be undone.`)) return false;

  customDeleteRunning = true;
  try {
    const remaining = all[shiftKey].filter((item) => String(item?.id || "") !== taskId);
    if (remaining.length) all[shiftKey] = remaining;
    else delete all[shiftKey];
    customDeleteWrite(CUSTOM_DELETE_KEYS.customTasks, all);

    removeIdFromCompleted(taskId, shiftKey);
    removeIdFromMapStore(CUSTOM_DELETE_KEYS.states, taskId, shiftKey);
    removeIdFromMapStore(CUSTOM_DELETE_KEYS.checklists, taskId, shiftKey);

    setCustomDeleteStatus("Task deleted");
    navigator.vibrate?.(25);
    refreshAfterCustomDelete(taskId, shiftKey);
    return true;
  } finally {
    customDeleteRunning = false;
  }
}

function handleCustomDeleteClick(event) {
  const button = event.target.closest?.("[data-delete-custom-task]");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  deleteCustomTask(String(button.dataset.deleteCustomTask || ""));
}

function queueCustomDeleteEnhance() {
  if (customDeleteQueued) return;
  customDeleteQueued = true;
  requestAnimationFrame(() => {
    customDeleteQueued = false;
    enhanceCustomTaskRows();
  });
}

function startCustomTaskDelete() {
  document.addEventListener("click", handleCustomDeleteClick, true);
  document.addEventListener("click", (event) => {
    if (event.target.closest?.('[data-screen="tasks"], .shift-button')) setTimeout(queueCustomDeleteEnhance, 40);
  });
  window.addEventListener("storage", (event) => {
    if (!event.key || Object.values(CUSTOM_DELETE_KEYS).includes(event.key)) queueCustomDeleteEnhance();
  });
  window.addEventListener("focus", queueCustomDeleteEnhance);

  customDeleteObserver = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.type === "childList" && (mutation.target.id === "screen-content" || mutation.target.closest?.("#screen-content")))) {
      queueCustomDeleteEnhance();
    }
  });
  customDeleteObserver.observe(document.body, { childList: true, subtree: true });
  queueCustomDeleteEnhance();
}

window.StorePilotCustomTaskDelete = {
  version: CUSTOM_DELETE_RELEASE,
  delete: (taskId, options = {}) => deleteCustomTask(String(taskId || ""), options),
  list: currentCustomTasks
};

document.documentElement.dataset.customTaskDelete = CUSTOM_DELETE_RELEASE;
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startCustomTaskDelete, { once: true });
else startCustomTaskDelete();
