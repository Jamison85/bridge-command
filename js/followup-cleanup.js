const CLEANUP_KEYS = {
  completed: "storePilot.completed.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  taskStates: "storePilot.taskStates.v6",
  templates: "storePilot.templates.v7"
};

function cleanupReadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function cleanupShift() {
  return cleanupReadJSON(CLEANUP_KEYS.shift, "morning");
}

function cleanupDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function cleanupShiftKey() {
  return `${cleanupDateKey()}:${cleanupShift()}`;
}

function cleanupTasks() {
  const templates = cleanupReadJSON(CLEANUP_KEYS.templates, {});
  const custom = cleanupReadJSON(CLEANUP_KEYS.customTasks, {})[cleanupShiftKey()] || [];
  return [...(templates[cleanupShift()] || []), ...custom];
}

function cleanupCompleted() {
  return cleanupReadJSON(CLEANUP_KEYS.completed, {})[cleanupShiftKey()] || [];
}

function cleanupStates() {
  return cleanupReadJSON(CLEANUP_KEYS.taskStates, {})[cleanupShiftKey()] || {};
}

function actionableTasks() {
  const done = new Set(cleanupCompleted());
  const stateMap = cleanupStates();
  return cleanupTasks().filter((task) => !done.has(task.id) && !stateMap[task.id]);
}

function documentedFollowups() {
  const done = new Set(cleanupCompleted());
  const stateMap = cleanupStates();
  return cleanupTasks().filter((task) => !done.has(task.id) && stateMap[task.id]);
}

function updateHeroIfNeeded() {
  const active = actionableTasks();
  const followups = documentedFollowups();
  if (active.length) return;
  const nextTitle = document.querySelector("#next-title");
  const nextCopy = document.querySelector("#next-copy");
  const startButton = document.querySelector("#complete-next");
  if (!nextTitle || !nextCopy || !startButton) return;
  nextTitle.textContent = "Active work handled";
  nextCopy.textContent = followups.length
    ? `${followups.length} item${followups.length === 1 ? " is" : "s are"} documented as delayed or carried forward for handoff.`
    : "The active task list is handled for this shift.";
  startButton.disabled = true;
}

function moveFollowupsOutOfTaskList() {
  const taskRows = [...document.querySelectorAll(".task-row.delayed, .task-row.carry")];
  const screenTitle = document.querySelector("#screen-title")?.textContent || "";
  const isTasksScreen = screenTitle.toLowerCase().includes("tasks");
  const isNextScreen = screenTitle.toLowerCase().includes("next");

  if (isNextScreen && taskRows.length) {
    const content = document.querySelector("#screen-content");
    if (!content || actionableTasks().length) return;
    content.innerHTML = `<div class="empty-state"><strong>No active task waiting.</strong><p>Delayed and carried items are documented in the End-of-Day Review.</p></div>`;
    return;
  }

  if (!isTasksScreen || !taskRows.length || document.querySelector(".followup-bucket")) return;

  const bucket = document.createElement("section");
  bucket.className = "followup-bucket";
  bucket.innerHTML = `<div class="followup-bucket-header"><strong>Follow-ups documented</strong><span>${taskRows.length}</span></div><p>These are no longer active tasks for this shift. They will still show in the end-of-day review.</p>`;
  const list = document.createElement("div");
  list.className = "followup-bucket-list";

  taskRows.forEach((row) => {
    row.classList.add("moved-followup");
    list.appendChild(row);
  });

  bucket.appendChild(list);
  document.querySelector("#screen-content")?.appendChild(bucket);
}

function cleanupFollowups() {
  updateHeroIfNeeded();
  moveFollowupsOutOfTaskList();
}

document.addEventListener("click", () => setTimeout(cleanupFollowups, 35));
document.addEventListener("change", () => setTimeout(cleanupFollowups, 35));
window.addEventListener("storage", cleanupFollowups);
setInterval(cleanupFollowups, 1200);
setTimeout(cleanupFollowups, 120);
