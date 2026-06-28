const TEMPLATE_REVIEW = {
  completed: "storePilot.completed.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  taskStates: "storePilot.taskStates.v6",
  templates: "storePilot.templates.v7",
  handoffPrefs: "storePilot.handoffPrefs.v10"
};

const SHIFT_NAMES = { morning: "Morning", mid: "Mid", close: "Close" };
const RECIPIENTS = {
  loretta: "Loretta",
  richard: "Richard",
  both: "Loretta and Richard"
};

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function currentShift() {
  return readJSON(TEMPLATE_REVIEW.shift, "morning");
}

function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftKey() {
  return `${dateKey()}:${currentShift()}`;
}

function dayPart() {
  const hour = new Date().getHours();
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}

function getTemplateReviewData() {
  const shift = currentShift();
  const templates = readJSON(TEMPLATE_REVIEW.templates, {});
  const custom = readJSON(TEMPLATE_REVIEW.customTasks, {})[shiftKey()] || [];
  const tasks = [...(templates[shift] || []), ...custom];
  const completedIds = new Set(readJSON(TEMPLATE_REVIEW.completed, {})[shiftKey()] || []);
  const states = readJSON(TEMPLATE_REVIEW.taskStates, {})[shiftKey()] || {};
  return {
    shift,
    tasks,
    completed: tasks.filter((task) => completedIds.has(task.id)),
    delayed: tasks.filter((task) => !completedIds.has(task.id) && states[task.id]?.type === "delayed"),
    carried: tasks.filter((task) => !completedIds.has(task.id) && states[task.id]?.type === "carry"),
    open: tasks.filter((task) => !completedIds.has(task.id) && !states[task.id]),
    states
  };
}

function buildMessage(review) {
  const prefs = readJSON(TEMPLATE_REVIEW.handoffPrefs, { recipient: "loretta", tone: "positive" });
  const recipient = RECIPIENTS[prefs.recipient] || "Loretta";
  const quick = prefs.tone === "quick";
  const issue = prefs.tone === "issue";
  const doneLines = review.completed.length
    ? review.completed.slice(0, quick ? 6 : 12).map((task) => `• ${task.title}`).join("\n")
    : "• Kept the shift moving and identified the highest-priority follow-ups.";
  const followUps = [
    ...review.delayed.map((task) => `• ${task.title} - delayed: ${review.states[task.id]?.reason || "reason noted"}`),
    ...review.carried.map((task) => `• ${task.title} - carried forward: ${review.states[task.id]?.reason || "next best window"}`),
    ...review.open.map((task) => `• ${task.title} - still watching`)
  ];
  const followUpLines = followUps.length ? followUps.slice(0, issue ? 12 : quick ? 4 : 8).join("\n") : "• No major follow-ups from the planned list at this time.";
  const opener = quick ? "quick" : issue ? "follow-up focused" : prefs.tone === "detailed" ? "detailed" : "quick";
  return `Good ${dayPart()} ${recipient}, ${opener} ${SHIFT_NAMES[review.shift].toLowerCase()} shift update from Jamison.\n\nI was able to complete ${review.completed.length} of ${review.tasks.length} planned items for this shift.\n\nCompleted / moved forward:\n${doneLines}\n\nFollow-ups identified / carry forward:\n${followUpLines}\n\nI prioritized the highest-impact customer-facing and operational items first and documented anything that needs the next best window. No reply needed unless you want anything handled differently.`;
}

function option(value, label, selected) {
  return `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`;
}

function list(title, items, states = {}) {
  const body = items.length
    ? items.slice(0, 10).map((task) => `<li>${escapeHTML(task.title)}${states[task.id]?.reason ? ` <small>(${escapeHTML(states[task.id].reason)})</small>` : ""}</li>`).join("")
    : "<li>Nothing listed here.</li>";
  return `<div class="review-section"><h4>${title}</h4><ul>${body}</ul></div>`;
}

function stat(label, value) {
  return `<div class="review-stat"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderTemplateAwareReview() {
  const logButton = document.querySelector('[data-screen="log"]');
  if (!logButton?.classList.contains("active")) return;
  const content = document.querySelector("#screen-content");
  const eyebrow = document.querySelector("#screen-eyebrow");
  const title = document.querySelector("#screen-title");
  if (!content || !eyebrow || !title) return;
  const review = getTemplateReviewData();
  const prefs = readJSON(TEMPLATE_REVIEW.handoffPrefs, { recipient: "loretta", tone: "positive" });
  const message = buildMessage(review);
  eyebrow.textContent = "Review";
  title.textContent = "End-of-Day";
  content.innerHTML = `<article class="review-card"><div class="screen-header"><div><p class="eyebrow">END OF DAY REVIEW</p><h3>Template-aware review</h3></div><span class="badge">${SHIFT_NAMES[review.shift]}</span></div><div class="review-grid">${stat("Done", review.completed.length)}${stat("Delayed", review.delayed.length)}${stat("Carry", review.carried.length)}${stat("Watch", review.open.length)}</div><div class="review-section handoff-options"><h4>Handoff options</h4><div class="handoff-option-grid"><label>Send to<select id="handoff-recipient">${option("loretta", "Loretta", prefs.recipient)}${option("richard", "Richard", prefs.recipient)}${option("both", "Both", prefs.recipient)}</select></label><label>Tone<select id="handoff-tone">${option("quick", "Quick", prefs.tone)}${option("detailed", "Detailed", prefs.tone)}${option("issue", "Issue-focused", prefs.tone)}${option("positive", "Positive spin", prefs.tone)}</select></label></div></div>${list("Completed", review.completed)}${list("Delayed", review.delayed, review.states)}${list("Carry Forward", review.carried, review.states)}${list("Still Watching", review.open)}<div class="review-section"><h4>Editable message</h4><textarea class="review-message-box" id="review-message">${escapeHTML(message)}</textarea><div class="review-actions"><button class="primary-action" id="share-review" type="button">Text / Share</button><button class="secondary-action" id="copy-review" type="button">Copy</button><button class="secondary-action" id="refresh-review" type="button">Refresh Message</button></div></div></article>`;
  document.querySelector("#handoff-recipient")?.addEventListener("change", savePrefsAndRefresh);
  document.querySelector("#handoff-tone")?.addEventListener("change", savePrefsAndRefresh);
  document.querySelector("#refresh-review")?.addEventListener("click", renderTemplateAwareReview);
  document.querySelector("#copy-review")?.addEventListener("click", () => copyText(document.querySelector("#review-message")?.value || message));
  document.querySelector("#share-review")?.addEventListener("click", () => shareText(document.querySelector("#review-message")?.value || message));
}

function savePrefsAndRefresh() {
  localStorage.setItem(TEMPLATE_REVIEW.handoffPrefs, JSON.stringify({ recipient: document.querySelector("#handoff-recipient")?.value || "loretta", tone: document.querySelector("#handoff-tone")?.value || "positive" }));
  renderTemplateAwareReview();
}

async function copyText(text) {
  await navigator.clipboard?.writeText(text);
  setStatus("Copied");
}

async function shareText(text) {
  if (navigator.share) {
    try { await navigator.share({ title: "Shift update", text }); setStatus("Share opened"); return; } catch {}
  }
  window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
}

function setStatus(text) {
  const status = document.querySelector("#system-status");
  if (!status) return;
  status.textContent = text;
  setTimeout(() => { status.textContent = "Ready"; }, 1600);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

document.addEventListener("click", (event) => {
  if (event.target.closest('[data-screen="log"]') || event.target.closest(".shift-button")) {
    setTimeout(renderTemplateAwareReview, 25);
  }
});

setTimeout(renderTemplateAwareReview, 50);
