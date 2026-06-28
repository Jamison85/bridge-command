const REVIEW_STORAGE = {
  completed: "storePilot.completed.v6",
  notes: "storePilot.notes.v6",
  reports: "storePilot.reports.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  taskStates: "storePilot.taskStates.v6"
};

const REVIEW_SHIFT_LABELS = { morning: "Morning", mid: "Mid", close: "Close" };

const REVIEW_TASKS = {
  morning: [
    t("bookwork", "Bookwork / SmartSafe match", "Opening"),
    t("smart-counts", "Smart Counts", "Inventory"),
    t("lto", "LTO screenshot to Loretta", "Admin"),
    t("morning-walk", "Morning walk", "Walk"),
    t("coffee-fountain", "Coffee and fountain reset", "Guest"),
    t("open-air", "Open-air cooler dates", "Fresh"),
    t("food-warmers", "Food warmers check", "Fresh"),
    t("shift-note", "Morning handoff note", "Closeout")
  ],
  mid: [
    t("mid-walk", "Mid-shift floor reset walk", "Walk"),
    t("coffee-fountain-mid", "Coffee / fountain recovery", "Guest"),
    t("cooler-fresh-mid", "Cooler and fresh food check", "Fresh"),
    t("restrooms-mid", "Restrooms and trash pass", "Guest"),
    t("backstock-mid", "Backstock / back room quick reset", "Stock"),
    t("handoff-mid", "Mid-shift handoff note", "Closeout")
  ],
  close: [
    t("close-walk", "Closing walk and recovery", "Walk"),
    t("dates-close", "Fresh food / cooler date pass", "Fresh"),
    t("coffee-fountain-close", "Coffee and fountain close reset", "Guest"),
    t("restrooms-close", "Restrooms, trash, and floor", "Guest"),
    t("lock-doors", "Lock doors / closing timing", "Close"),
    t("handoff-close", "Closing handoff note", "Closeout")
  ]
};

const REVIEW_WEEKLY = {
  0: [t("outs", "Sunday outs check", "Weekly")],
  1: [t("store-order", "Store order by 2 PM", "Weekly")],
  2: [t("cig-audit", "Cigarette audits", "Weekly"), t("backstock", "Backstock and back room reset", "Weekly")],
  3: [t("truck-prep", "Truck prep and walkway clear", "Truck"), t("truck-triage", "Truck triage", "Truck")]
};

function t(id, title, area) {
  return { id, title, area };
}

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function getDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getCurrentShift() {
  return readJSON(REVIEW_STORAGE.shift, getDefaultShift());
}

function getDefaultShift() {
  const hour = new Date().getHours();
  if (hour < 10) return "morning";
  if (hour < 16) return "mid";
  return "close";
}

function getShiftKey() {
  return `${getDateKey()}:${getCurrentShift()}`;
}

function getReviewTasks() {
  const shift = getCurrentShift();
  const base = REVIEW_TASKS[shift] || REVIEW_TASKS.morning;
  const weekly = shift === "morning" ? (REVIEW_WEEKLY[new Date().getDay()] || []) : [];
  const custom = readJSON(REVIEW_STORAGE.customTasks, {})[getShiftKey()] || [];
  return [...base, ...weekly, ...custom];
}

function getReviewData() {
  const tasks = getReviewTasks();
  const completedIds = new Set(readJSON(REVIEW_STORAGE.completed, {})[getShiftKey()] || []);
  const states = readJSON(REVIEW_STORAGE.taskStates, {})[getShiftKey()] || {};
  const reports = readJSON(REVIEW_STORAGE.reports, []);
  const notes = readJSON(REVIEW_STORAGE.notes, []);

  return {
    shift: getCurrentShift(),
    tasks,
    completed: tasks.filter((task) => completedIds.has(task.id)),
    delayed: tasks.filter((task) => !completedIds.has(task.id) && states[task.id]?.type === "delayed"),
    carried: tasks.filter((task) => !completedIds.has(task.id) && states[task.id]?.type === "carry"),
    open: tasks.filter((task) => !completedIds.has(task.id) && !states[task.id]),
    states,
    reports,
    notes
  };
}

function renderReviewIfLog() {
  const logButton = document.querySelector('[data-screen="log"]');
  if (!logButton?.classList.contains("active")) return;
  renderEndOfDayReview();
}

function renderEndOfDayReview() {
  const content = document.querySelector("#screen-content");
  const eyebrow = document.querySelector("#screen-eyebrow");
  const title = document.querySelector("#screen-title");
  if (!content || !eyebrow || !title) return;

  const review = getReviewData();
  const message = buildEditableMessage(review);
  eyebrow.textContent = "Review";
  title.textContent = "End-of-Day";
  content.innerHTML = `
    <article class="review-card">
      <div class="screen-header">
        <div>
          <p class="eyebrow">END OF DAY REVIEW</p>
          <h3>Check before sending</h3>
        </div>
        <span class="badge">${REVIEW_SHIFT_LABELS[review.shift]}</span>
      </div>

      <div class="review-grid">
        ${stat("Done", review.completed.length)}
        ${stat("Delayed", review.delayed.length)}
        ${stat("Carry", review.carried.length)}
        ${stat("Watch", review.open.length)}
      </div>

      ${section("Completed", review.completed)}
      ${section("Delayed", review.delayed, review.states)}
      ${section("Carry Forward", review.carried, review.states)}
      ${section("Still Watching", review.open)}

      <div class="review-section">
        <h4>Editable message</h4>
        <p class="helper-text">Review this before sending. It is written to sound productive and positive, not defensive.</p>
        <textarea class="review-message-box" id="review-message">${escapeHTML(message)}</textarea>
        <div class="review-actions">
          <button class="primary-action" type="button" id="share-review">Text / Share</button>
          <button class="secondary-action" type="button" id="copy-review">Copy</button>
          <button class="secondary-action" type="button" id="refresh-review">Refresh Message</button>
        </div>
      </div>
    </article>`;

  document.querySelector("#share-review")?.addEventListener("click", () => shareText(document.querySelector("#review-message")?.value || message));
  document.querySelector("#copy-review")?.addEventListener("click", () => copyText(document.querySelector("#review-message")?.value || message));
  document.querySelector("#refresh-review")?.addEventListener("click", renderEndOfDayReview);
}

function stat(label, value) {
  return `<div class="review-stat"><span>${label}</span><strong>${value}</strong></div>`;
}

function section(label, items, states = {}) {
  if (!items.length) return `<div class="review-section"><h4>${label}</h4><ul><li>Nothing listed here.</li></ul></div>`;
  const lines = items.slice(0, 10).map((item) => {
    const reason = states[item.id]?.reason ? ` <small>(${escapeHTML(states[item.id].reason)})</small>` : "";
    return `<li>${escapeHTML(item.title)}${reason}</li>`;
  }).join("");
  return `<div class="review-section"><h4>${label}</h4><ul>${lines}</ul></div>`;
}

function buildEditableMessage(review) {
  const completedLines = review.completed.length
    ? review.completed.slice(0, 12).map((task) => `• ${task.title}`).join("\n")
    : "• Kept the shift moving and identified the highest-priority follow-ups.";

  const followUps = [
    ...review.delayed.map((task) => `• ${task.title} - delayed: ${review.states[task.id]?.reason || "reason noted"}`),
    ...review.carried.map((task) => `• ${task.title} - carried forward: ${review.states[task.id]?.reason || "next best window"}`),
    ...review.open.map((task) => `• ${task.title} - still watching`)
  ];

  const followUpLines = followUps.length ? followUps.slice(0, 10).join("\n") : "• No major follow-ups from the planned list at this time.";

  return `Good ${getDayPart()}, quick ${REVIEW_SHIFT_LABELS[review.shift].toLowerCase()} shift update from Jamison.\n\nI was able to complete ${review.completed.length} of ${review.tasks.length} planned items for this shift, including:\n${completedLines}\n\nFollow-ups identified / carry forward:\n${followUpLines}\n\nI prioritized the highest-impact customer-facing and operational items first and documented delays or carry-forward items as they came up. No reply needed unless you want anything handled differently.`;
}

function getDayPart() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

async function shareText(text) {
  if (navigator.share) {
    try {
      await navigator.share({ title: "Shift update", text });
      setStatus("Share opened");
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }
  window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
  setStatus("Opening messages");
}

async function copyText(text) {
  try {
    await navigator.clipboard?.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  setStatus("Copied");
}

function setStatus(text) {
  const status = document.querySelector("#system-status");
  if (!status) return;
  status.textContent = text;
  clearTimeout(setStatus.timer);
  setStatus.timer = setTimeout(() => { status.textContent = "Ready"; }, 1600);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

document.addEventListener("click", (event) => {
  if (event.target.closest('[data-screen="log"]') || event.target.closest(".shift-button")) {
    setTimeout(renderReviewIfLog, 0);
  }
});

setTimeout(renderReviewIfLog, 0);
