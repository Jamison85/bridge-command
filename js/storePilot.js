const STORAGE_KEYS = {
  completed: "storeBridge.completedTasks.v1",
  reports: "storeBridge.incidentReports.v1",
  notes: "storeBridge.captainsLog.v1",
  voice: "storeBridge.voiceNotes.v1"
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const BASE_TASKS = [
  {
    id: "bookwork",
    title: "Bookwork / SmartSafe match",
    area: "Opening",
    minutes: 35,
    priority: 100,
    due: "08:30",
    shifts: ["morning"],
    guidance: "Verify SmartSafe, deposits, lottery, and starting cash before the floor starts eating your attention."
  },
  {
    id: "smart-counts",
    title: "Smart Counts",
    area: "Inventory",
    minutes: 18,
    priority: 92,
    due: "09:15",
    shifts: ["morning"],
    guidance: "Do immediately after books when possible. Counts age badly, like gas station coffee under a heat lamp."
  },
  {
    id: "lto-screenshot",
    title: "LTO report screenshot to Loretta",
    area: "Compliance",
    minutes: 8,
    priority: 98,
    due: "10:00",
    shifts: ["morning"],
    guidance: "Grab 3 items, verify the report, and send the screenshot before Richard has a reason to care."
  },
  {
    id: "daily-walk",
    title: "Daily walk and obvious fires check",
    area: "Floor",
    minutes: 12,
    priority: 86,
    due: "10:30",
    shifts: ["morning", "mid", "evening"],
    guidance: "Front doors, restrooms, cooler, coffee, fountain, trash, wet floors, and anything customers can weaponize emotionally."
  },
  {
    id: "open-air-cooler",
    title: "Open-air cooler dates and rotation",
    area: "Cooler",
    minutes: 18,
    priority: 72,
    due: "12:00",
    shifts: ["morning", "mid"],
    guidance: "Check dates, face it cleanly, and pull anything that will embarrass you later."
  },
  {
    id: "coffee-fountain",
    title: "Coffee/Fountain supplies",
    area: "Sales Floor",
    minutes: 14,
    priority: 70,
    due: "11:00",
    shifts: ["morning", "mid", "evening"],
    guidance: "Cups, lids, straws, filters, coffee area, fountain area, and visible stickiness. Humanity notices sticky."
  },
  {
    id: "bibs",
    title: "BIBs check",
    area: "Fountain",
    minutes: 10,
    priority: 68,
    due: "13:00",
    shifts: ["morning", "mid", "evening"],
    guidance: "Check bag-in-box sodas before the fountain becomes a customer complaint dispenser."
  },
  {
    id: "food-warmers",
    title: "Food warmers check",
    area: "Kitchen/Food",
    minutes: 10,
    priority: 76,
    due: "11:30",
    shifts: ["morning", "mid", "evening"],
    guidance: "Confirm presentation, dates, holding quality, and whether the warmer looks like it has seen battle."
  },
  {
    id: "restrooms",
    title: "Restrooms reset",
    area: "Customer Experience",
    minutes: 12,
    priority: 64,
    due: "14:00",
    shifts: ["morning", "mid", "evening"],
    guidance: "Fast reset: paper, trash, floors, smell, sink, mirror. The bar is low and somehow still missed by civilization."
  },
  {
    id: "shift-note",
    title: "Shift note to Loretta if anything slipped",
    area: "Communication",
    minutes: 8,
    priority: 74,
    due: "15:00",
    shifts: ["morning", "mid", "evening"],
    guidance: "Document what happened, what was notified, and what got moved. Protect Future You from nonsense."
  },
  {
    id: "closing-lock",
    title: "Closing lockup reminder",
    area: "Closing",
    minutes: 10,
    priority: 92,
    due: "22:50",
    shifts: ["evening"],
    guidance: "Ten minutes before close: doors, register area, safety walk, trash, and final customer path."
  },
  {
    id: "mop-midshift",
    title: "Mid-shift floor touch-up",
    area: "Floor",
    minutes: 14,
    priority: 58,
    due: "16:00",
    shifts: ["mid", "evening"],
    guidance: "Hit visible traffic areas. Do not attempt a museum restoration during a rush."
  }
];

const WEEKLY_TASKS = [
  {
    id: "monday-store-order",
    title: "Store order due by 2 PM",
    area: "Weekly",
    minutes: 35,
    priority: 110,
    due: "14:00",
    days: [1],
    guidance: "Monday order has a real deadline. Do it early before the day develops opinions."
  },
  {
    id: "tuesday-cig-audit",
    title: "Cigarette audits",
    area: "Weekly",
    minutes: 120,
    priority: 108,
    due: "13:00",
    days: [2],
    guidance: "Tuesday audit block. Count cartons and boxes cleanly. Cartons equal 10. Math, tragically, matters."
  },
  {
    id: "tuesday-backstock",
    title: "Backstock out and back room organized",
    area: "Weekly",
    minutes: 45,
    priority: 84,
    due: "17:00",
    days: [2],
    guidance: "Get backstock moving and clear the back room before truck day turns it into a cardboard ecosystem."
  },
  {
    id: "truck-prep",
    title: "Truck prep: carts, dollies, clear walkway",
    area: "Truck Day",
    minutes: 22,
    priority: 104,
    due: "08:00",
    days: [3],
    guidance: "Wednesday truck prep: carts and dollies up front, back walkway clear, receiving path ready. Future You will not forgive laziness here."
  },
  {
    id: "truck-triage",
    title: "Truck triage and first-pass priorities",
    area: "Truck Day",
    minutes: 45,
    priority: 106,
    due: "10:30",
    days: [3],
    guidance: "Work the highest-impact freight first: safety path, cooler/floor needs, obvious outs, and anything blocking operations."
  },
  {
    id: "sunday-outs",
    title: "Sunday outs completed",
    area: "Weekly",
    minutes: 45,
    priority: 102,
    due: "20:00",
    days: [0],
    guidance: "Sunday day or night: outs need finished. Nobody enjoys Monday surprises, except chaos, and chaos is unemployed."
  }
];

export function createStorePilot({ panel, onDisplay, onStatus }) {
  const completed = loadJson(STORAGE_KEYS.completed, {});
  const reports = loadJson(STORAGE_KEYS.reports, []);
  const notes = loadJson(STORAGE_KEYS.notes, []);
  const voiceNotes = loadJson(STORAGE_KEYS.voice, []);

  let activeCommand = "next";
  let recognition = null;
  let recognizing = false;

  function render(command = activeCommand) {
    activeCommand = command;

    if (!panel) return;

    const actions = {
      tasks: renderTasks,
      next: renderNextAction,
      report: renderReport,
      history: renderHistory,
      voice: renderVoice,
      open: renderOpening,
      focus: renderFocus,
      notes: renderNotes
    };

    const renderer = actions[command] ?? renderNextAction;
    panel.innerHTML = renderer();
    bindPanelEvents();
  }

  function getScreenContent(command) {
    const nextAction = getNextAction();

    const screens = {
      tasks: {
        title: "Task Console",
        copy: `${getOpenTasks().length} active shift tasks loaded. Highest priority: ${nextAction?.title ?? "nothing urgent"}.`,
        mode: "Tasks",
        focus: "Guided"
      },
      next: {
        title: "Next Action",
        copy: nextAction ? `${nextAction.title}: ${nextAction.guidance}` : "No urgent task detected. Use the notes or report console if something weird happened.",
        mode: "Next",
        focus: nextAction ? nextAction.area : "Clear"
      },
      report: {
        title: "Incident Report",
        copy: "Build a clean manager-ready incident note with times, notifications, impact, and delayed work.",
        mode: "Report",
        focus: "Document"
      },
      history: {
        title: "Shift History",
        copy: `${Object.keys(completed).length} completed task records, ${reports.length} reports, and ${voiceNotes.length} voice notes saved locally on this device.`,
        mode: "History",
        focus: "Review"
      },
      voice: {
        title: "Voice Command",
        copy: "Capture quick notes by speech when supported, or type them manually. Either way, the bridge gets the log.",
        mode: "Voice",
        focus: "Capture"
      },
      open: {
        title: "Opening Systems",
        copy: "Morning launch checklist loaded: books, counts, LTO, walk, cooler, and supplies.",
        mode: "Open",
        focus: "Launch"
      },
      focus: {
        title: "Focus Lock",
        copy: nextAction ? `One task only: ${nextAction.title}. No wandering into side quests.` : "No urgent task is currently selected.",
        mode: "Focus",
        focus: "Locked"
      },
      notes: {
        title: "Captain's Log",
        copy: "Save shift notes for anything that needs context later. Future You deserves receipts.",
        mode: "Notes",
        focus: "Log"
      }
    };

    return screens[command] ?? screens.next;
  }

  function renderNextAction() {
    const action = getNextAction();

    if (!action) {
      return `
        <div class="pilot-card pilot-card--hero">
          <p class="pilot-kicker">NEXT BEST ACTION</p>
          <h3>Nothing urgent detected</h3>
          <p>The queue is clear enough for a reset walk, quick notes, or pretending the shift is under control.</p>
        </div>
      `;
    }

    return `
      <div class="pilot-card pilot-card--hero">
        <div class="pilot-card-header">
          <div>
            <p class="pilot-kicker">NEXT BEST ACTION</p>
            <h3>${escapeHtml(action.title)}</h3>
          </div>
          <span class="priority-chip">${escapeHtml(action.area)}</span>
        </div>
        <p>${escapeHtml(action.guidance)}</p>
        <div class="task-meta">
          <span>${action.minutes} min</span>
          <span>Due ${formatDue(action.due)}</span>
          <span>${getShiftLabel()} shift</span>
        </div>
        <div class="pilot-actions">
          <button class="mini-button primary" type="button" data-action="complete" data-task-id="${action.id}">Mark Done</button>
          <button class="mini-button" type="button" data-action="snooze" data-task-id="${action.id}">Snooze</button>
          <button class="mini-button" type="button" data-action="render" data-command="report">Report Delay</button>
        </div>
      </div>
      ${renderProgressStrip()}
    `;
  }

  function renderTasks() {
    const tasks = getOpenTasks();
    const completedToday = getTodayCompletedTasks();

    return `
      <div class="pilot-toolbar">
        <span>${tasks.length} active</span>
        <span>${completedToday.length} done today</span>
        <button class="mini-button" type="button" data-action="reset-today">Reset Today</button>
      </div>
      <div class="task-list">
        ${tasks.map(renderTaskRow).join("") || "<p class='empty-state'>All tracked tasks are complete. Suspicious, but delightful.</p>"}
      </div>
    `;
  }

  function renderOpening() {
    const openingTasks = getOpenTasks().filter((task) => task.shifts?.includes("morning") || task.area === "Opening" || task.area === "Compliance");

    return `
      <div class="pilot-card">
        <p class="pilot-kicker">OPENING SEQUENCE</p>
        <h3>Morning launch order</h3>
        <p>Do the boring official things first. The sales floor can scream after the money and reports are right.</p>
      </div>
      <div class="task-list compact">
        ${openingTasks.map(renderTaskRow).join("") || "<p class='empty-state'>Opening list is clear for today.</p>"}
      </div>
    `;
  }

  function renderFocus() {
    const action = getNextAction();

    if (!action) {
      return "<div class='pilot-card'><p class='pilot-kicker'>FOCUS LOCK</p><h3>No urgent target</h3><p>Run a quick store walk or add a note. Try not to invent panic as a hobby.</p></div>";
    }

    return `
      <div class="focus-lock">
        <p class="pilot-kicker">FOCUS LOCK</p>
        <h3>${escapeHtml(action.title)}</h3>
        <p>${escapeHtml(action.guidance)}</p>
        <div class="focus-timer" aria-label="Estimated task time">${action.minutes}<span>min</span></div>
        <button class="mini-button primary wide" type="button" data-action="complete" data-task-id="${action.id}">Complete Focus Task</button>
      </div>
    `;
  }

  function renderReport() {
    const now = new Date();
    const time = now.toTimeString().slice(0, 5);

    return `
      <form class="pilot-form" data-report-form>
        <label>
          Incident type
          <select name="type">
            <option>Power / network outage</option>
            <option>Register issue</option>
            <option>Short staffed</option>
            <option>Weather / leak / safety issue</option>
            <option>Customer incident</option>
            <option>Task delay</option>
          </select>
        </label>

        <div class="form-grid">
          <label>
            Start
            <input name="start" type="time" value="${time}" />
          </label>
          <label>
            End / current
            <input name="end" type="time" />
          </label>
        </div>

        <label>
          Who was notified?
          <input name="notified" type="text" placeholder="Loretta, Richard, IT, etc." />
        </label>

        <label>
          What happened?
          <textarea name="summary" rows="3" placeholder="Brief facts only. No courtroom novel."></textarea>
        </label>

        <label>
          Impact / what got delayed
          <textarea name="impact" rows="3" placeholder="Bookwork delayed, cooler not finished, short staffed, etc."></textarea>
        </label>

        <label>
          Action taken
          <textarea name="actionTaken" rows="3" placeholder="Called IT, cleaned spill, moved task, notified manager..."></textarea>
        </label>

        <div class="pilot-actions">
          <button class="mini-button primary" type="submit">Generate Report</button>
          <button class="mini-button" type="button" data-action="copy-report">Copy</button>
        </div>

        <textarea class="report-output" id="report-output" rows="6" readonly placeholder="Generated report will appear here."></textarea>
      </form>
    `;
  }

  function renderVoice() {
    const supported = getSpeechRecognitionClass() !== null;

    return `
      <div class="pilot-card">
        <p class="pilot-kicker">VOICE CAPTURE</p>
        <h3>${supported ? "Speech capture ready" : "Manual voice note mode"}</h3>
        <p>${supported ? "Tap record and talk. The transcript saves as a shift note." : "This browser does not support speech recognition here, so type the note. The universe remains inconvenient."}</p>
      </div>

      <form class="pilot-form" data-voice-form>
        <textarea name="voiceText" id="voice-text" rows="5" placeholder="Voice note transcript or typed note..."></textarea>
        <div class="pilot-actions">
          <button class="mini-button ${supported ? "primary" : ""}" type="button" data-action="toggle-voice" ${supported ? "" : "disabled"}>${recognizing ? "Stop Listening" : "Start Listening"}</button>
          <button class="mini-button primary" type="submit">Save Note</button>
        </div>
      </form>
    `;
  }

  function renderNotes() {
    return `
      <form class="pilot-form" data-note-form>
        <label>
          Captain's log
          <textarea name="note" rows="5" placeholder="What happened, what changed, what Future You needs to know..."></textarea>
        </label>
        <button class="mini-button primary wide" type="submit">Save Log Entry</button>
      </form>
      <div class="history-list">
        ${notes.slice(0, 4).map(renderHistoryItem).join("") || "<p class='empty-state'>No captain's log entries yet.</p>"}
      </div>
    `;
  }

  function renderHistory() {
    const completedItems = getTodayCompletedTasks();

    return `
      <div class="pilot-toolbar">
        <span>${completedItems.length} done today</span>
        <span>${reports.length} reports</span>
        <span>${voiceNotes.length} voice notes</span>
      </div>
      <div class="history-list">
        ${reports.slice(0, 3).map(renderHistoryItem).join("")}
        ${voiceNotes.slice(0, 3).map(renderHistoryItem).join("")}
        ${notes.slice(0, 3).map(renderHistoryItem).join("")}
        ${completedItems.slice(0, 5).map((item) => renderHistoryItem({ title: item.title, body: `Completed ${formatDateTime(item.completedAt)}` })).join("")}
        ${reports.length + voiceNotes.length + notes.length + completedItems.length === 0 ? "<p class='empty-state'>No history yet. A clean slate, which is either peaceful or suspicious.</p>" : ""}
      </div>
    `;
  }

  function renderTaskRow(task) {
    return `
      <article class="task-row">
        <div>
          <div class="task-row-title">${escapeHtml(task.title)}</div>
          <p>${escapeHtml(task.guidance)}</p>
          <div class="task-meta">
            <span>${escapeHtml(task.area)}</span>
            <span>${task.minutes} min</span>
            <span>Due ${formatDue(task.due)}</span>
          </div>
        </div>
        <button class="task-done" type="button" data-action="complete" data-task-id="${task.id}" aria-label="Mark ${escapeHtml(task.title)} done">✓</button>
      </article>
    `;
  }

  function renderProgressStrip() {
    const active = getOpenTasks().length;
    const done = getTodayCompletedTasks().length;
    const total = active + done;
    const progress = total ? Math.round((done / total) * 100) : 100;

    return `
      <div class="progress-strip">
        <div>
          <span>${done}/${total}</span>
          <p>tracked tasks complete</p>
        </div>
        <div class="progress-bar"><span style="width: ${progress}%"></span></div>
      </div>
    `;
  }

  function renderHistoryItem(item) {
    return `
      <article class="history-item">
        <strong>${escapeHtml(item.title ?? item.type ?? "Saved item")}</strong>
        <p>${escapeHtml(item.body ?? item.text ?? item.summary ?? "")}</p>
        ${item.createdAt ? `<span>${formatDateTime(item.createdAt)}</span>` : ""}
      </article>
    `;
  }

  function bindPanelEvents() {
    panel.querySelectorAll("[data-action='complete']").forEach((button) => {
      button.addEventListener("click", () => {
        completeTask(button.dataset.taskId);
        notifyDisplayFor(activeCommand);
        render(activeCommand);
      });
    });

    panel.querySelectorAll("[data-action='snooze']").forEach((button) => {
      button.addEventListener("click", () => {
        snoozeTask(button.dataset.taskId);
        notifyDisplayFor("next");
        render("next");
      });
    });

    panel.querySelectorAll("[data-action='render']").forEach((button) => {
      button.addEventListener("click", () => {
        notifyDisplayFor(button.dataset.command);
        render(button.dataset.command);
      });
    });

    panel.querySelector("[data-action='reset-today']")?.addEventListener("click", () => {
      resetToday();
      notifyDisplayFor("tasks");
      render("tasks");
    });

    panel.querySelector("[data-report-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const output = buildReport(new FormData(event.currentTarget));
      const reportOutput = panel.querySelector("#report-output");
      if (reportOutput) reportOutput.value = output.body;
      reports.unshift(output);
      saveJson(STORAGE_KEYS.reports, reports);
      onStatus?.("Report Saved");
    });

    panel.querySelector("[data-action='copy-report']")?.addEventListener("click", async () => {
      const reportOutput = panel.querySelector("#report-output");
      if (!reportOutput?.value) return;
      try {
        await navigator.clipboard.writeText(reportOutput.value);
        onStatus?.("Report Copied");
      } catch {
        reportOutput.select();
        onStatus?.("Copy Manually");
      }
    });

    panel.querySelector("[data-action='toggle-voice']")?.addEventListener("click", toggleVoiceCapture);

    panel.querySelector("[data-voice-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = new FormData(event.currentTarget).get("voiceText")?.toString().trim();
      if (!text) return;
      voiceNotes.unshift({ title: "Voice Note", body: text, createdAt: new Date().toISOString() });
      saveJson(STORAGE_KEYS.voice, voiceNotes);
      onStatus?.("Voice Note Saved");
      render("history");
      notifyDisplayFor("history");
    });

    panel.querySelector("[data-note-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = new FormData(event.currentTarget).get("note")?.toString().trim();
      if (!text) return;
      notes.unshift({ title: "Captain's Log", body: text, createdAt: new Date().toISOString() });
      saveJson(STORAGE_KEYS.notes, notes);
      onStatus?.("Log Saved");
      render("notes");
    });
  }

  function notifyDisplayFor(command) {
    const content = getScreenContent(command);
    onDisplay?.(content);
    activeCommand = command;
  }

  function getTasksForToday() {
    const now = new Date();
    const day = now.getDay();
    const shift = getShiftKey(now);

    const base = BASE_TASKS.filter((task) => !task.shifts || task.shifts.includes(shift));
    const weekly = WEEKLY_TASKS.filter((task) => task.days?.includes(day));

    return [...base, ...weekly].map((task) => ({ ...task, score: scoreTask(task, now, shift) })).sort((a, b) => b.score - a.score);
  }

  function getOpenTasks() {
    const todayKey = getDateKey();
    const todayCompleted = completed[todayKey] ?? {};

    return getTasksForToday().filter((task) => !todayCompleted[task.id]);
  }

  function getNextAction() {
    return getOpenTasks()[0] ?? null;
  }

  function getTodayCompletedTasks() {
    const todayKey = getDateKey();
    const todayCompleted = completed[todayKey] ?? {};

    return Object.entries(todayCompleted).map(([id, value]) => {
      const task = [...BASE_TASKS, ...WEEKLY_TASKS].find((candidate) => candidate.id === id);
      return {
        id,
        title: task?.title ?? id,
        completedAt: value.completedAt
      };
    });
  }

  function completeTask(taskId) {
    if (!taskId) return;
    const todayKey = getDateKey();
    completed[todayKey] = completed[todayKey] ?? {};
    completed[todayKey][taskId] = { completedAt: new Date().toISOString() };
    saveJson(STORAGE_KEYS.completed, completed);
    onStatus?.("Task Complete");
  }

  function snoozeTask(taskId) {
    const task = getOpenTasks().find((candidate) => candidate.id === taskId);
    if (!task) return;

    task.priority = Math.max(0, task.priority - 25);
    onStatus?.("Snoozed Once");
  }

  function resetToday() {
    delete completed[getDateKey()];
    saveJson(STORAGE_KEYS.completed, completed);
    onStatus?.("Today Reset");
  }

  function scoreTask(task, now, shift) {
    const minutesUntilDue = getMinutesUntilDue(task.due, now);
    const overdue = minutesUntilDue < 0 ? Math.min(45, Math.abs(minutesUntilDue) / 3) : 0;
    const dueSoon = minutesUntilDue >= 0 && minutesUntilDue <= 60 ? 24 : 0;
    const shiftBonus = task.shifts?.includes(shift) ? 8 : 0;
    const dayBonus = task.days?.includes(now.getDay()) ? 16 : 0;
    const truckBonus = now.getDay() === 3 && task.area === "Truck Day" ? 18 : 0;

    return task.priority + overdue + dueSoon + shiftBonus + dayBonus + truckBonus;
  }

  function buildReport(formData) {
    const now = new Date();
    const data = Object.fromEntries(formData.entries());
    const body = [
      `Update from Jamison - ${formatDateTime(now.toISOString())}`,
      `Incident type: ${data.type || "Not specified"}`,
      `Time: ${data.start || "unknown"}${data.end ? ` to ${data.end}` : " / ongoing"}`,
      `Notified: ${data.notified || "Not yet listed"}`,
      "",
      `What happened: ${data.summary || "Details pending."}`,
      "",
      `Impact / delayed work: ${data.impact || "No delayed work listed yet."}`,
      "",
      `Action taken: ${data.actionTaken || "Action still in progress."}`,
      "",
      "No reply needed unless you want me to handle this differently."
    ].join("\n");

    return {
      title: data.type || "Incident Report",
      body,
      createdAt: now.toISOString()
    };
  }

  function toggleVoiceCapture() {
    const RecognitionClass = getSpeechRecognitionClass();
    if (!RecognitionClass) return;

    if (recognizing && recognition) {
      recognition.stop();
      recognizing = false;
      render("voice");
      return;
    }

    recognition = new RecognitionClass();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      const textarea = panel.querySelector("#voice-text");
      if (textarea) textarea.value = text;
    };

    recognition.onend = () => {
      recognizing = false;
      const button = panel.querySelector("[data-action='toggle-voice']");
      if (button) button.textContent = "Start Listening";
    };

    recognizing = true;
    recognition.start();
    const button = panel.querySelector("[data-action='toggle-voice']");
    if (button) button.textContent = "Stop Listening";
  }

  function getSpeechRecognitionClass() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function getShiftKey(date = new Date()) {
    const hour = date.getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "mid";
    return "evening";
  }

  function getShiftLabel() {
    const key = getShiftKey();
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  function getDateKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  function getMinutesUntilDue(due, now) {
    if (!due) return 999;
    const [hours, minutes] = due.split(":").map(Number);
    const dueDate = new Date(now);
    dueDate.setHours(hours, minutes, 0, 0);
    return Math.round((dueDate.getTime() - now.getTime()) / 60000);
  }

  function formatDue(due) {
    if (!due) return "today";
    const [hour, minute] = due.split(":").map(Number);
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function formatDateTime(value) {
    const date = value instanceof Date ? value : new Date(value);
    return `${DAY_NAMES[date.getDay()]} ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  return {
    render,
    getScreenContent,
    getNextAction
  };
}
