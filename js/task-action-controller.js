import {
  appendCustomTask,
  clearChecklistRecord,
  completeTaskRecords,
  normalizeTaskTitle,
  removeTaskArtifacts,
  reopenTaskRecords,
  setTaskStateRecord
} from "./task-action-model.js?v=command-center-26";

const TASK_ACTION_RELEASE = "command-center-26";
const TASK_ACTION_KEYS = {
  completed: "storePilot.completed.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  states: "storePilot.taskStates.v6",
  checklists: "storePilot.taskChecklists.v1"
};
const SHIFT_ORDER = ["morning", "mid", "close"];
const SHIFT_LABELS = { morning: "Morning", mid: "Mid", close: "Close" };
const RECENT_ACTION_MS = 650;

let heroPointerAt = 0;
let actionLocked = false;
const recentActions = new Map();

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function currentShift() {
  const shift = readJSON(TASK_ACTION_KEYS.shift, "morning");
  return SHIFT_ORDER.includes(shift) ? shift : "morning";
}

function shiftKey(shift = currentShift(), date = new Date()) {
  return `${dateKey(date)}:${shift}`;
}

function analysis() {
  try { return window.StorePilotCommandCenter?.analyze?.() || null; }
  catch { return null; }
}

function currentTasks() {
  const value = analysis()?.data?.tasks;
  return Array.isArray(value) ? value : [];
}

function taskById(taskId) {
  const id = String(taskId || "");
  return currentTasks().find((task) => String(task?.id || "") === id) || null;
}

function isWalkTask(task) {
  return task?.area === "Walk"
    || /(^|-)walk($|-)/i.test(String(task?.id || ""))
    || /\bwalk\b/i.test(String(task?.title || ""));
}

function needsChecklist(task) {
  return Boolean(task?.checklistType)
    || (Array.isArray(task?.checklistItems) && task.checklistItems.length > 0);
}

function setStatus(text) {
  const status = document.querySelector("#system-status");
  if (!status) return;
  status.textContent = text;
  clearTimeout(setStatus.timer);
  setStatus.timer = setTimeout(() => { status.textContent = "Ready"; }, 2400);
}

function claimEvent(event) {
  event.preventDefault?.();
  event.stopPropagation?.();
  event.stopImmediatePropagation?.();
}

function actionIsRecent(key) {
  const now = Date.now();
  const previous = recentActions.get(key) || 0;
  recentActions.set(key, now);
  for (const [name, time] of recentActions) {
    if (now - time > 4000) recentActions.delete(name);
  }
  return now - previous < RECENT_ACTION_MS;
}

function dispatchTasksChanged(taskIds, detail = {}) {
  const key = shiftKey();
  window.dispatchEvent(new CustomEvent("storepilot:tasks-changed", {
    detail: { shiftKey: key, taskIds: [...new Set(taskIds.map(String))], ...detail }
  }));
  window.dispatchEvent(new Event("storage"));
}

function rerenderCurrentScreen(statusText, { taskIds = [], detail = {}, banner = "" } = {}) {
  dispatchTasksChanged(taskIds, detail);
  const activeShift = document.querySelector(".shift-button.active");
  if (activeShift) activeShift.click();
  else window.StorePilotCommandCenter?.render?.();

  setTimeout(() => {
    window.StorePilotCommandCenter?.render?.();
    if (banner && document.querySelector('[data-screen="tasks"]')?.classList.contains("active")) {
      const content = document.querySelector("#screen-content");
      if (content) {
        content.querySelector("[data-task-action-feedback]")?.remove();
        const message = document.createElement("div");
        message.className = "empty-state";
        message.dataset.taskActionFeedback = "true";
        message.innerHTML = `<strong>${escapeHTML(banner)}</strong>`;
        content.prepend(message);
      }
    }
    setStatus(statusText);
  }, 60);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));
}

function matchingOpenTaskIds(task, currentAnalysis) {
  const completed = new Set(currentAnalysis?.data?.completedIds || []);
  const target = normalizeTaskTitle(task?.title);
  const tasks = Array.isArray(currentAnalysis?.data?.tasks) ? currentAnalysis.data.tasks : [task];
  const matches = tasks.filter((item) => !completed.has(item.id) && normalizeTaskTitle(item?.title) === target);
  return (matches.length ? matches : [task]).map((item) => String(item?.id || "")).filter(Boolean);
}

function completeTask(task, { matchTitles = false, statusText = "Marked done", banner = "" } = {}) {
  if (!task || actionLocked) return false;
  const currentAnalysis = analysis();
  const key = currentAnalysis?.data?.key || shiftKey();
  const taskIds = matchTitles ? matchingOpenTaskIds(task, currentAnalysis) : [String(task.id || "")];
  if (!taskIds[0]) return false;

  actionLocked = true;
  try {
    const next = completeTaskRecords(
      readJSON(TASK_ACTION_KEYS.completed, {}),
      readJSON(TASK_ACTION_KEYS.states, {}),
      key,
      taskIds
    );
    writeJSON(TASK_ACTION_KEYS.completed, next.completedStore);
    writeJSON(TASK_ACTION_KEYS.states, next.stateStore);
    navigator.vibrate?.(30);
    rerenderCurrentScreen(taskIds.length > 1 ? `${taskIds.length} matching tasks marked done` : statusText, {
      taskIds,
      banner
    });
    return true;
  } finally {
    setTimeout(() => { actionLocked = false; }, 180);
  }
}

function reopenTask(task) {
  if (!task || actionLocked) return false;
  const key = analysis()?.data?.key || shiftKey();
  const taskId = String(task.id || "");
  actionLocked = true;
  try {
    const next = reopenTaskRecords(
      readJSON(TASK_ACTION_KEYS.completed, {}),
      readJSON(TASK_ACTION_KEYS.states, {}),
      key,
      taskId
    );
    writeJSON(TASK_ACTION_KEYS.completed, next.completedStore);
    writeJSON(TASK_ACTION_KEYS.states, next.stateStore);
    if (needsChecklist(task)) {
      writeJSON(
        TASK_ACTION_KEYS.checklists,
        clearChecklistRecord(readJSON(TASK_ACTION_KEYS.checklists, {}), key, taskId)
      );
    }
    rerenderCurrentScreen("Task reopened", { taskIds: [taskId], detail: { reopened: true } });
    return true;
  } finally {
    setTimeout(() => { actionLocked = false; }, 180);
  }
}

function delayTask(task) {
  if (!task || actionLocked) return false;
  const reason = window.prompt(
    "Why is this delayed?",
    "Customer volume / register coverage / short staffing / time constraint"
  ) || "Reason noted";
  const key = analysis()?.data?.key || shiftKey();
  writeJSON(
    TASK_ACTION_KEYS.states,
    setTaskStateRecord(readJSON(TASK_ACTION_KEYS.states, {}), key, task.id, {
      type: "delayed",
      reason,
      updatedAt: new Date().toISOString()
    })
  );
  rerenderCurrentScreen("Marked delayed", { taskIds: [task.id], detail: { state: "delayed" } });
  return true;
}

function carryTargetKey(destination) {
  const today = new Date();
  if (String(destination || "").toLowerCase().includes("tomorrow")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return shiftKey("morning", tomorrow);
  }
  const shift = currentShift();
  const index = SHIFT_ORDER.indexOf(shift);
  const nextShift = SHIFT_ORDER[index + 1] || "morning";
  const targetDate = new Date(today);
  if (!SHIFT_ORDER[index + 1]) targetDate.setDate(today.getDate() + 1);
  return shiftKey(nextShift, targetDate);
}

function carryTask(task) {
  if (!task || actionLocked) return false;
  const destination = window.prompt("Carry forward to next shift or tomorrow?", "Next shift") || "Next shift";
  const sourceKey = analysis()?.data?.key || shiftKey();
  const targetKey = carryTargetKey(destination);
  const customStore = readJSON(TASK_ACTION_KEYS.customTasks, {});
  const targetList = Array.isArray(customStore[targetKey]) ? customStore[targetKey] : [];
  const customTask = {
    id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: `Carry forward: ${task.title}`,
    area: "Carry Forward",
    minutes: 8,
    priority: 40 + targetList.length,
    detail: `Carried forward from ${SHIFT_LABELS[currentShift()]} shift. Destination/reason: ${destination}.`
  };

  writeJSON(TASK_ACTION_KEYS.customTasks, appendCustomTask(customStore, targetKey, customTask));
  writeJSON(
    TASK_ACTION_KEYS.states,
    setTaskStateRecord(readJSON(TASK_ACTION_KEYS.states, {}), sourceKey, task.id, {
      type: "carry",
      reason: destination,
      updatedAt: new Date().toISOString()
    })
  );
  rerenderCurrentScreen("Carried forward", { taskIds: [task.id], detail: { state: "carry", targetKey } });
  return true;
}

function openTaskScreenAndFind(task, selector) {
  document.querySelector('[data-screen="tasks"]')?.click();
  setTimeout(() => {
    const target = document.querySelector(selector);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.querySelector?.("input:not(:checked)")?.focus();
  }, 190);
  setStatus(isWalkTask(task) ? "Open the walk checklist" : "Open the required checklist");
}

function openWalk(task) {
  const id = CSS.escape(String(task?.id || ""));
  openTaskScreenAndFind(task, `button[data-task="${id}"]`);
}

function openChecklist(task) {
  const id = CSS.escape(String(task?.id || ""));
  openTaskScreenAndFind(task, `[data-photo-checklist="${id}"]`);
}

function finishWalk(button) {
  const card = button.closest(".walk-card");
  const taskId = String(button.dataset.walkTask || card?.querySelector("[data-task]")?.dataset.task || "");
  const task = taskById(taskId);
  if (!task) return setStatus("Walk task not found");

  const boxes = [...(card?.querySelectorAll("[data-walk-item]") || [])];
  const unchecked = boxes.filter((box) => !box.checked);
  let customStore = readJSON(TASK_ACTION_KEYS.customTasks, {});
  const key = analysis()?.data?.key || shiftKey();
  let existing = Array.isArray(customStore[key]) ? customStore[key].length : 0;

  unchecked.forEach((box) => {
    const label = box.closest("label")?.textContent?.trim() || `Walk item ${Number(box.dataset.walkItem || 0) + 1}`;
    customStore = appendCustomTask(customStore, key, {
      id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: `Follow up: ${label}`,
      area: "Follow-up",
      minutes: 8,
      priority: 40 + existing,
      detail: `Created from ${task.title} because this was not complete yet.`
    });
    existing += 1;
  });
  writeJSON(TASK_ACTION_KEYS.customTasks, customStore);
  completeTask(task, {
    statusText: unchecked.length ? `${unchecked.length} follow-up added` : "Walk complete",
    banner: unchecked.length
      ? `Walk complete. ${unchecked.length} follow-up${unchecked.length === 1 ? "" : "s"} added to Tasks.`
      : "Walk complete. No follow-ups needed."
  });
}

function finishChecklist(button) {
  const taskId = String(button.dataset.photoCheckComplete || "");
  const task = taskById(taskId);
  const checklist = button.closest("[data-photo-checklist]");
  const boxes = [...(checklist?.querySelectorAll("[data-photo-check-item]") || [])];
  const missing = boxes.filter((box) => !box.checked);
  if (missing.length) {
    setStatus(`${missing.length} photo${missing.length === 1 ? "" : "s"} still needed`);
    missing[0]?.focus();
    return;
  }
  if (!task) return setStatus("Photo task not found");
  completeTask(task, { statusText: "Photo check-in complete" });
}

function deleteCustomTask(taskId) {
  const id = String(taskId || "");
  const service = window.StorePilotCustomTaskDelete;
  if (service?.delete) return service.delete(id, { confirmDelete: true });

  const key = shiftKey();
  const customStore = readJSON(TASK_ACTION_KEYS.customTasks, {});
  const tasks = Array.isArray(customStore[key]) ? customStore[key] : [];
  const task = tasks.find((item) => String(item?.id || "") === id);
  if (!task) return false;
  if (!window.confirm(`Delete “${String(task.title || "this task")}” from this shift?\n\nThis cannot be undone.`)) return false;

  const remaining = tasks.filter((item) => String(item?.id || "") !== id);
  if (remaining.length) customStore[key] = remaining;
  else delete customStore[key];
  writeJSON(TASK_ACTION_KEYS.customTasks, customStore);

  const cleaned = removeTaskArtifacts({
    completed: readJSON(TASK_ACTION_KEYS.completed, {}),
    states: readJSON(TASK_ACTION_KEYS.states, {}),
    checklists: readJSON(TASK_ACTION_KEYS.checklists, {})
  }, key, id);
  writeJSON(TASK_ACTION_KEYS.completed, cleaned.completed);
  writeJSON(TASK_ACTION_KEYS.states, cleaned.states);
  writeJSON(TASK_ACTION_KEYS.checklists, cleaned.checklists);
  rerenderCurrentScreen("Task deleted", { taskIds: [id], detail: { deleted: true } });
  return true;
}

function runTaskAction(task, action) {
  if (!task) return setStatus("Task data not ready");
  if (action === "done") {
    if (needsChecklist(task)) return openChecklist(task);
    if (isWalkTask(task)) return openWalk(task);
    return completeTask(task);
  }
  if (action === "undo") return reopenTask(task);
  if (action === "delay") return delayTask(task);
  if (action === "carry") return carryTask(task);
}

function runHeroAction() {
  const currentAnalysis = analysis();
  const task = currentAnalysis?.next;
  if (!task) {
    document.querySelector('[data-screen="log"]')?.click();
    return;
  }
  if (needsChecklist(task)) return openChecklist(task);
  if (isWalkTask(task)) return openWalk(task);
  completeTask(task, { matchTitles: true });
}

function handleHeroPointer(event) {
  const button = event.target?.closest?.("#complete-next");
  if (!button || button.disabled) return;
  claimEvent(event);
  const actionKey = "hero";
  if (actionIsRecent(actionKey)) return;
  heroPointerAt = Date.now();
  runHeroAction();
}

function handleClick(event) {
  const hero = event.target?.closest?.("#complete-next");
  if (hero) {
    claimEvent(event);
    if (Date.now() - heroPointerAt < RECENT_ACTION_MS || actionIsRecent("hero")) return;
    runHeroAction();
    return;
  }

  const deleteButton = event.target?.closest?.("[data-delete-custom-task]");
  if (deleteButton) {
    claimEvent(event);
    const taskId = String(deleteButton.dataset.deleteCustomTask || "");
    if (!actionIsRecent(`delete:${taskId}`)) deleteCustomTask(taskId);
    return;
  }

  const photoFinish = event.target?.closest?.("[data-photo-check-complete]");
  if (photoFinish) {
    claimEvent(event);
    const taskId = String(photoFinish.dataset.photoCheckComplete || "");
    if (!actionIsRecent(`photo:${taskId}`)) finishChecklist(photoFinish);
    return;
  }

  const walkFinish = event.target?.closest?.("[data-walk-action='finish']");
  if (walkFinish) {
    claimEvent(event);
    const taskId = String(walkFinish.dataset.walkTask || "");
    if (!actionIsRecent(`walk:${taskId}`)) finishWalk(walkFinish);
    return;
  }

  const taskButton = event.target?.closest?.("button[data-task-action][data-task]");
  if (!taskButton) return;
  claimEvent(event);
  const taskId = String(taskButton.dataset.task || "");
  const action = String(taskButton.dataset.taskAction || "");
  if (actionIsRecent(`${action}:${taskId}`)) return;
  runTaskAction(taskById(taskId), action);
}

function startTaskActions() {
  window.addEventListener("pointerdown", handleHeroPointer, { capture: true, passive: false });
  window.addEventListener("click", handleClick, true);
  document.documentElement.dataset.taskActions = TASK_ACTION_RELEASE;
}

window.StorePilotTaskActions = {
  version: TASK_ACTION_RELEASE,
  next: runHeroAction,
  run: (taskId, action) => runTaskAction(taskById(taskId), action),
  complete: (taskId) => completeTask(taskById(taskId)),
  reopen: (taskId) => reopenTask(taskById(taskId)),
  delete: deleteCustomTask
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startTaskActions, { once: true });
else startTaskActions();