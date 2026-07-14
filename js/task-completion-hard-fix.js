(function () {
  "use strict";

  const KEYS = {
    completed: "storePilot.completed.v6",
    states: "storePilot.taskStates.v6"
  };

  let locked = false;
  let lastHandledAt = 0;

  function readJSON(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeTitle(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function eventPoint(event) {
    const touch = event.changedTouches?.[0] || event.touches?.[0];
    if (touch) return { x: touch.clientX, y: touch.clientY };
    if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
      return { x: event.clientX, y: event.clientY };
    }
    return null;
  }

  function eventHitsButton(event, button) {
    if (!button) return false;
    if (event.target?.closest?.("#complete-next")) return true;
    const point = eventPoint(event);
    if (!point) return false;
    const rect = button.getBoundingClientRect();
    return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
  }

  function setStatus(text) {
    const status = document.querySelector("#system-status");
    if (!status) return;
    status.textContent = text;
    clearTimeout(setStatus.timer);
    setStatus.timer = setTimeout(() => {
      status.textContent = "Ready";
    }, 2200);
  }

  function updateProgress(completedCount, totalCount) {
    const percent = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
    const progressText = document.querySelector("#progress-text");
    const progressFill = document.querySelector("#progress-fill");
    const ringText = document.querySelector("#progress-ring-text");
    const ring = document.querySelector(".progress-ring");
    const subtext = document.querySelector("#progress-subtext");

    if (progressText) progressText.textContent = `${percent}%`;
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (ringText) ringText.textContent = `${percent}%`;
    if (ring) ring.style.setProperty("--progress-angle", `${percent * 3.6}deg`);
    if (subtext) subtext.textContent = `${completedCount} of ${totalCount} tasks complete.`;
  }

  function refreshDashboard() {
    try {
      window.StorePilotCommandCenter?.render?.();
    } catch {
      // The direct storage update is already complete. The next focus or reload will still reflect it.
    }

    window.dispatchEvent(new Event("storage"));

    setTimeout(() => {
      try {
        window.StorePilotCommandCenter?.render?.();
      } catch {
        // Keep the stored completion even if another UI module fails.
      }
    }, 60);
  }

  function needsChecklist(task) {
    return task?.checklistType === "manager-photo-checkin"
      || (Array.isArray(task?.checklistItems) && task.checklistItems.length > 0);
  }

  function openRequiredChecklist(task) {
    document.querySelector('[data-screen="tasks"]')?.click();
    setStatus("Open the required checklist");
    setTimeout(() => {
      const selector = `[data-photo-checklist="${CSS.escape(String(task.id || ""))}"]`;
      const checklist = document.querySelector(selector);
      checklist?.scrollIntoView({ behavior: "smooth", block: "center" });
      checklist?.querySelector("input:not(:checked)")?.focus();
    }, 180);
  }

  function completeCurrentTask(button) {
    if (locked) return;

    const analysis = window.StorePilotCommandCenter?.analyze?.();
    const task = analysis?.next;

    if (!task || !analysis?.data?.key) {
      setStatus("Task data not ready");
      return;
    }

    if (needsChecklist(task)) {
      openRequiredChecklist(task);
      return;
    }

    if (/walk/i.test(`${task.area || ""} ${task.title || ""}`)) {
      document.querySelector('[data-screen="tasks"]')?.click();
      return;
    }

    locked = true;
    const key = analysis.data.key;
    const completedStore = readJSON(KEYS.completed, {});
    const completed = new Set(completedStore[key] || []);
    const targetTitle = normalizeTitle(task.title);
    const tasks = Array.isArray(analysis.data.tasks) ? analysis.data.tasks : [task];
    const matches = tasks.filter((item) => !completed.has(item.id) && normalizeTitle(item.title) === targetTitle);
    const ids = (matches.length ? matches : [task]).map((item) => item.id);

    ids.forEach((id) => completed.add(id));
    completedStore[key] = [...completed];
    writeJSON(KEYS.completed, completedStore);

    const stateStore = readJSON(KEYS.states, {});
    const shiftStates = { ...(stateStore[key] || {}) };
    ids.forEach((id) => delete shiftStates[id]);
    stateStore[key] = shiftStates;
    writeJSON(KEYS.states, stateStore);

    button.textContent = "Done ✓";
    button.disabled = true;
    button.classList.add("task-completion-confirmed");

    updateProgress(completed.size, tasks.length);
    setStatus(ids.length > 1 ? `${ids.length} matching tasks marked done` : "Marked done");

    window.dispatchEvent(new CustomEvent("storepilot:tasks-changed", {
      detail: { shiftKey: key, taskIds: ids }
    }));

    setTimeout(() => {
      refreshDashboard();
      locked = false;
    }, 140);
  }

  function interceptCompletion(event) {
    const button = document.querySelector("#complete-next");
    if (!button || button.disabled || !eventHitsButton(event, button)) return;

    const now = Date.now();
    if (now - lastHandledAt < 650) {
      event.preventDefault?.();
      event.stopPropagation?.();
      event.stopImmediatePropagation?.();
      return;
    }
    lastHandledAt = now;

    event.preventDefault?.();
    event.stopPropagation?.();
    event.stopImmediatePropagation?.();
    completeCurrentTask(button);
  }

  window.addEventListener("pointerdown", interceptCompletion, true);
  window.addEventListener("touchstart", interceptCompletion, { capture: true, passive: false });
  window.addEventListener("click", interceptCompletion, true);

  document.documentElement.dataset.taskCompletion = "hard-fix-ready";
  window.StorePilotTaskCompletion = {
    completeCurrent: () => completeCurrentTask(document.querySelector("#complete-next")),
    normalizeTitle
  };
})();