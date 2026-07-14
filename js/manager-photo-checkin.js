const PHOTO_CHECK_KEYS = {
  templates: "storePilot.templates.v7",
  shift: "storePilot.shift.v6",
  context: "storePilot.shiftContext.v2",
  completed: "storePilot.completed.v6",
  states: "storePilot.taskStates.v6",
  checklists: "storePilot.taskChecklists.v1"
};

const PHOTO_CHECK_ITEMS = [
  "Soda cooler",
  "Beer cooler",
  "Pizza warmers",
  "Sandwich warmers",
  "Ice vaults",
  "Bathrooms"
];

const PHOTO_CHECK_TASKS = {
  morning: {
    id: "lto",
    title: "Manager photo check-in to Loretta",
    area: "Manager",
    minutes: 8,
    priority: 3,
    due: "8:00 AM",
    detail: "Take and send all six required photos to Loretta. Only applies when you are the manager at this checkpoint.",
    managerOnly: true,
    checklistType: "manager-photo-checkin",
    checklistItems: PHOTO_CHECK_ITEMS
  },
  mid: {
    id: "manager-photo-checkin-2pm",
    title: "Manager photo check-in to Loretta",
    area: "Manager",
    minutes: 8,
    priority: 1,
    due: "2:00 PM",
    detail: "Take and send all six required photos to Loretta. Only applies when you are the manager at this checkpoint.",
    managerOnly: true,
    checklistType: "manager-photo-checkin",
    checklistItems: PHOTO_CHECK_ITEMS
  },
  close: {
    id: "manager-photo-checkin-8pm",
    title: "Manager photo check-in to Loretta",
    area: "Manager",
    minutes: 8,
    priority: 4,
    due: "8:00 PM",
    detail: "Take and send all six required photos to Loretta. Only applies when you are the manager at this checkpoint.",
    managerOnly: true,
    checklistType: "manager-photo-checkin",
    checklistItems: PHOTO_CHECK_ITEMS
  }
};

const PHOTO_TASK_IDS = new Set(Object.values(PHOTO_CHECK_TASKS).map((task) => task.id));
let photoSyncing = false;
let photoRefreshing = false;
let photoRenderQueued = false;
let photoObserver = null;

function photoRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function photoWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function photoEscape(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));
}

function photoDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function photoShift() {
  const shift = photoRead(PHOTO_CHECK_KEYS.shift, "morning");
  return PHOTO_CHECK_TASKS[shift] ? shift : "morning";
}

function photoShiftKey(shift = photoShift()) {
  return `${photoDateKey()}:${shift}`;
}

function photoRole(shift = photoShift()) {
  const contexts = photoRead(PHOTO_CHECK_KEYS.context, {});
  return contexts[photoShiftKey(shift)]?.role || "manager";
}

function isPhotoTask(task) {
  return PHOTO_TASK_IDS.has(String(task?.id || ""))
    || task?.checklistType === "manager-photo-checkin"
    || (String(task?.id || "") === "lto" && /lto|photo.*loretta/i.test(String(task?.title || "")));
}

function normalizeTask(task, shift) {
  const desired = PHOTO_CHECK_TASKS[shift];
  return { ...task, ...desired, checklistItems: [...PHOTO_CHECK_ITEMS] };
}

function insertionIndex(shift, tasks) {
  if (shift === "morning") return Math.min(2, tasks.length);
  if (shift === "mid") return 0;
  return Math.min(3, tasks.length);
}

function syncPhotoTaskForCurrentShift({ refresh = true } = {}) {
  if (photoSyncing) return false;
  photoSyncing = true;
  try {
    const shift = photoShift();
    const manager = photoRole(shift) === "manager";
    const templates = photoRead(PHOTO_CHECK_KEYS.templates, {});
    const current = Array.isArray(templates[shift]) ? [...templates[shift]] : [];
    const matchingIndexes = current
      .map((task, index) => isPhotoTask(task) ? index : -1)
      .filter((index) => index >= 0);
    let changed = false;

    if (manager) {
      if (matchingIndexes.length) {
        const firstIndex = matchingIndexes[0];
        const normalized = normalizeTask(current[firstIndex], shift);
        if (JSON.stringify(current[firstIndex]) !== JSON.stringify(normalized)) {
          current[firstIndex] = normalized;
          changed = true;
        }
        for (let index = matchingIndexes.length - 1; index >= 1; index -= 1) {
          current.splice(matchingIndexes[index], 1);
          changed = true;
        }
      } else {
        current.splice(insertionIndex(shift, current), 0, normalizeTask({}, shift));
        changed = true;
      }
    } else if (matchingIndexes.length) {
      for (let index = matchingIndexes.length - 1; index >= 0; index -= 1) current.splice(matchingIndexes[index], 1);
      changed = true;
    }

    if (!changed) return false;
    templates[shift] = current.map((task, index) => ({ ...task, priority: index + 1 }));
    photoWrite(PHOTO_CHECK_KEYS.templates, templates);
    window.dispatchEvent(new CustomEvent("storepilot:templates-changed", { detail: { shift, manager } }));
    if (refresh) refreshPhotoUI();
    return true;
  } finally {
    photoSyncing = false;
  }
}

function checklistStore() {
  const stored = photoRead(PHOTO_CHECK_KEYS.checklists, {});
  return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
}

function checklistFor(taskId) {
  const values = checklistStore()[photoShiftKey()]?.[taskId];
  if (!Array.isArray(values)) return PHOTO_CHECK_ITEMS.map(() => false);
  return PHOTO_CHECK_ITEMS.map((_, index) => Boolean(values[index]));
}

function saveChecklist(taskId, values) {
  const all = checklistStore();
  const key = photoShiftKey();
  all[key] = { ...(all[key] || {}), [taskId]: PHOTO_CHECK_ITEMS.map((_, index) => Boolean(values[index])) };
  photoWrite(PHOTO_CHECK_KEYS.checklists, all);
}

function clearChecklist(taskId) {
  const all = checklistStore();
  const key = photoShiftKey();
  if (!all[key]?.[taskId]) return;
  const shiftValues = { ...all[key] };
  delete shiftValues[taskId];
  all[key] = shiftValues;
  photoWrite(PHOTO_CHECK_KEYS.checklists, all);
}

function taskIsDone(taskId) {
  return (photoRead(PHOTO_CHECK_KEYS.completed, {})[photoShiftKey()] || []).includes(taskId);
}

function setPhotoStatus(text) {
  const status = document.querySelector("#system-status");
  if (!status) return;
  status.textContent = text;
  clearTimeout(setPhotoStatus.timer);
  setPhotoStatus.timer = setTimeout(() => { status.textContent = "Ready"; }, 2400);
}

function checklistHTML(taskId, done) {
  if (done) {
    return `<section class="manager-photo-checklist complete"><div><b>Six-photo check-in complete</b><span>The task is saved for this shift.</span></div></section>`;
  }
  const values = checklistFor(taskId);
  const completeCount = values.filter(Boolean).length;
  return `
    <section class="manager-photo-checklist" data-photo-checklist="${photoEscape(taskId)}">
      <div class="manager-photo-checklist-head"><div><b>Photos to send</b><span>Check each item after its picture is taken and sent.</span></div><strong data-photo-count>${completeCount}/6</strong></div>
      <div class="manager-photo-checklist-items">
        ${PHOTO_CHECK_ITEMS.map((label, index) => `<label><input type="checkbox" data-photo-check-item data-task="${photoEscape(taskId)}" data-index="${index}" ${values[index] ? "checked" : ""}><span>${photoEscape(label)}</span></label>`).join("")}
      </div>
      <button class="primary-action" type="button" data-photo-check-complete="${photoEscape(taskId)}" ${completeCount === PHOTO_CHECK_ITEMS.length ? "" : "disabled"}>Complete photo check-in</button>
    </section>`;
}

function enhancePhotoRows() {
  document.querySelectorAll("button[data-task]").forEach((button) => {
    const taskId = String(button.dataset.task || "");
    if (!PHOTO_TASK_IDS.has(taskId)) return;
    const row = button.closest(".task-row");
    if (!row || row.querySelector(".manager-photo-checklist")) return;
    row.classList.add("manager-photo-task-row");
    row.insertAdjacentHTML("beforeend", checklistHTML(taskId, taskIsDone(taskId)));
  });
}

function currentNextPhotoTask() {
  try {
    const task = window.StorePilotCommandCenter?.analyze?.().next;
    return PHOTO_TASK_IDS.has(String(task?.id || "")) ? task : null;
  } catch {
    return null;
  }
}

function enhancePhotoHero() {
  const task = currentNextPhotoTask();
  if (!task) return;
  const button = document.querySelector("#complete-next");
  if (button && !button.disabled) button.textContent = "Open photo checklist";
}

function queuePhotoEnhance() {
  if (photoRenderQueued) return;
  photoRenderQueued = true;
  requestAnimationFrame(() => {
    photoRenderQueued = false;
    enhancePhotoRows();
    enhancePhotoHero();
  });
}

function openPhotoChecklist(taskId) {
  document.querySelector('[data-screen="tasks"]')?.click();
  setTimeout(() => {
    syncPhotoTaskForCurrentShift({ refresh: false });
    queuePhotoEnhance();
    setTimeout(() => {
      const target = document.querySelector(`[data-photo-checklist="${CSS.escape(taskId)}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.querySelector("input:not(:checked)")?.focus();
    }, 90);
  }, 40);
  setPhotoStatus("Open the six-photo checklist");
}

function finishPhotoChecklist(taskId) {
  const values = checklistFor(taskId);
  const missing = values.filter((value) => !value).length;
  if (missing) {
    setPhotoStatus(`${missing} photo${missing === 1 ? "" : "s"} still needed`);
    document.querySelector(`[data-photo-checklist="${CSS.escape(taskId)}"] input:not(:checked)`)?.focus();
    return;
  }

  const key = photoShiftKey();
  const completed = photoRead(PHOTO_CHECK_KEYS.completed, {});
  completed[key] = [...new Set([...(completed[key] || []), taskId])];
  photoWrite(PHOTO_CHECK_KEYS.completed, completed);

  const stateStore = photoRead(PHOTO_CHECK_KEYS.states, {});
  const states = { ...(stateStore[key] || {}) };
  delete states[taskId];
  stateStore[key] = states;
  photoWrite(PHOTO_CHECK_KEYS.states, stateStore);

  setPhotoStatus("Photo check-in complete");
  navigator.vibrate?.(35);
  window.dispatchEvent(new CustomEvent("storepilot:tasks-changed", { detail: { shiftKey: key, taskIds: [taskId] } }));
  refreshPhotoUI();
}

function refreshPhotoUI() {
  if (photoRefreshing) return;
  photoRefreshing = true;
  setTimeout(() => {
    const activeShift = document.querySelector(".shift-button.active");
    if (activeShift) activeShift.click();
    else window.StorePilotCommandCenter?.render?.();
    setTimeout(() => {
      photoRefreshing = false;
      queuePhotoEnhance();
    }, 90);
  }, 0);
}

function eventHitsHeroButton(event) {
  const button = document.querySelector("#complete-next");
  if (!button || button.disabled) return false;
  if (event.target?.closest?.("#complete-next")) return true;
  const touch = event.changedTouches?.[0] || event.touches?.[0];
  const x = touch?.clientX ?? event.clientX;
  const y = touch?.clientY ?? event.clientY;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const rectangle = button.getBoundingClientRect();
  return x >= rectangle.left && x <= rectangle.right && y >= rectangle.top && y <= rectangle.bottom;
}

let lastHeroOpenAt = 0;
function interceptPhotoHero(event) {
  const task = currentNextPhotoTask();
  if (!task || !eventHitsHeroButton(event)) return;
  event.preventDefault?.();
  event.stopPropagation?.();
  event.stopImmediatePropagation?.();
  const now = Date.now();
  if (now - lastHeroOpenAt < 600) return;
  lastHeroOpenAt = now;
  openPhotoChecklist(task.id);
}

function handlePhotoChange(event) {
  const checkbox = event.target.closest?.("[data-photo-check-item]");
  if (!checkbox) return;
  const taskId = String(checkbox.dataset.task || "");
  if (!PHOTO_TASK_IDS.has(taskId)) return;
  const values = checklistFor(taskId);
  values[Number(checkbox.dataset.index)] = checkbox.checked;
  saveChecklist(taskId, values);
  const checklist = checkbox.closest(".manager-photo-checklist");
  const count = values.filter(Boolean).length;
  const counter = checklist?.querySelector("[data-photo-count]");
  const finish = checklist?.querySelector("[data-photo-check-complete]");
  if (counter) counter.textContent = `${count}/6`;
  if (finish) finish.disabled = count !== PHOTO_CHECK_ITEMS.length;
}

function handlePhotoClick(event) {
  const finish = event.target.closest?.("[data-photo-check-complete]");
  if (finish) {
    event.preventDefault();
    finishPhotoChecklist(String(finish.dataset.photoCheckComplete || ""));
    return;
  }

  const taskButton = event.target.closest?.("button[data-task]");
  if (!taskButton || !PHOTO_TASK_IDS.has(String(taskButton.dataset.task || ""))) return;
  if (taskButton.dataset.taskAction === "done") {
    event.preventDefault();
    event.stopPropagation();
    openPhotoChecklist(String(taskButton.dataset.task || ""));
  }
  if (taskButton.dataset.taskAction === "undo") clearChecklist(String(taskButton.dataset.task || ""));
}

function handleShiftOrContextChange(event) {
  if (event.target.closest?.(".shift-button")) {
    setTimeout(() => syncPhotoTaskForCurrentShift(), 30);
    return;
  }
  if (event.target.closest?.("[data-context-reset]")) {
    setTimeout(() => syncPhotoTaskForCurrentShift(), 50);
  }
}

function handleContextSubmit(event) {
  if (event.target.matches?.("#shift-context-form")) setTimeout(() => syncPhotoTaskForCurrentShift(), 50);
}

function startPhotoCheckin() {
  syncPhotoTaskForCurrentShift({ refresh: false });
  window.addEventListener("pointerdown", interceptPhotoHero, true);
  window.addEventListener("touchstart", interceptPhotoHero, { capture: true, passive: false });
  window.addEventListener("click", interceptPhotoHero, true);
  document.addEventListener("change", handlePhotoChange, true);
  document.addEventListener("click", handlePhotoClick, true);
  document.addEventListener("click", handleShiftOrContextChange);
  document.addEventListener("submit", handleContextSubmit);
  photoObserver = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.type === "childList")) queuePhotoEnhance();
  });
  photoObserver.observe(document.body, { childList: true, subtree: true });
  queuePhotoEnhance();
}

window.StorePilotManagerPhotoCheckin = {
  sync: syncPhotoTaskForCurrentShift,
  items: [...PHOTO_CHECK_ITEMS],
  open: () => {
    const task = PHOTO_CHECK_TASKS[photoShift()];
    openPhotoChecklist(task.id);
  }
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startPhotoCheckin, { once: true });
else startPhotoCheckin();
