const TEMPLATE_REVIEW = {
  completed: "storePilot.completed.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  taskStates: "storePilot.taskStates.v6",
  templates: "storePilot.templates.v7",
  handoffPrefs: "storePilot.handoffPrefs.v10",
  handoffVariant: "storePilot.handoffVariant.v1"
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

function reviewSeed(review, prefs) {
  const variant = readJSON(TEMPLATE_REVIEW.handoffVariant, 0);
  return `${dateKey()}-${review.shift}-${prefs.recipient}-${prefs.tone}-${review.completed.length}-${review.delayed.length}-${review.carried.length}-${review.open.length}-${variant}`;
}

function hashText(text) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) hash = ((hash << 5) - hash) + text.charCodeAt(index);
  return Math.abs(hash);
}

function pick(options, seed, offset = 0) {
  return options[(hashText(seed) + offset) % options.length];
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

function lineList(items, limit, emptyText, formatter = (task) => `• ${task.title}`) {
  if (!items.length) return `• ${emptyText}`;
  const visible = items.slice(0, limit).map(formatter);
  const hidden = items.length - visible.length;
  return hidden > 0 ? `${visible.join("\n")}\n• ${hidden} more item${hidden === 1 ? "" : "s"} still listed in the app.` : visible.join("\n");
}

function followupItems(review) {
  return [
    ...review.delayed.map((task) => ({ task, label: "Delayed", reason: review.states[task.id]?.reason || "reason noted" })),
    ...review.carried.map((task) => ({ task, label: "Carry forward", reason: review.states[task.id]?.reason || "next best window" })),
    ...review.open.map((task) => ({ task, label: "Still watching", reason: "not completed yet" }))
  ];
}

function completedSummary(review, limit) {
  return lineList(review.completed, limit, "No completed items were checked off yet, but the shift was reviewed and follow-ups were documented.");
}

function followupSummary(review, limit) {
  const items = followupItems(review);
  return lineList(items, limit, "No major follow-ups from the planned list at this time.", (item) => `• ${item.task.title} - ${item.label}: ${item.reason}`);
}

function recipientContext(recipientKey, seed) {
  if (recipientKey === "richard") {
    return {
      greeting: pick(["Good", "Hello", "Hi"], seed),
      focus: "I’m documenting the shift status and any operational impact so there is a clear record.",
      closing: pick([
        "No reply needed unless you want a different follow-up.",
        "I’ll keep anything still open documented for the next best window.",
        "Just keeping you informed so there is a clean trail on what was completed and what moved."
      ], seed, 3)
    };
  }

  if (recipientKey === "both") {
    return {
      greeting: pick(["Good", "Hello", "Hi"], seed),
      focus: "I wanted to give you both a clear shift update with what was handled and what still needs attention.",
      closing: pick([
        "No reply needed unless either of you wants me to handle something differently.",
        "I’ll keep the remaining items documented and ready for the next best window.",
        "This should give both of you a clean view of where the shift landed."
      ], seed, 5)
    };
  }

  return {
    greeting: pick(["Good", "Hi", "Hey"], seed),
    focus: pick([
      "I wanted to send you a real update on where the shift landed today.",
      "Here’s today’s shift update so you have a clear picture without having to dig for it.",
      "I’m sending the daily handoff with what got handled and what still needs a window."
    ], seed, 7),
    closing: pick([
      "No reply needed unless you want me to adjust anything.",
      "I’ll keep working from the highest-impact items first.",
      "I just wanted you to have a clear and honest update from the shift."
    ], seed, 9)
  };
}

function buildQuickMessage(review, prefs, seed, recipientName, context) {
  const followups = followupItems(review);
  return `${context.greeting} ${dayPart()} ${recipientName}, quick ${SHIFT_NAMES[review.shift].toLowerCase()} shift update from Jamison.\n\n${context.focus}\n\nCompleted: ${review.completed.length}/${review.tasks.length}\nFollow-ups: ${followups.length}\n\nTop completed:\n${completedSummary(review, 4)}\n\nNeeds follow-up:\n${followupSummary(review, 4)}\n\n${context.closing}`;
}

function buildDetailedMessage(review, prefs, seed, recipientName, context) {
  return `${context.greeting} ${dayPart()} ${recipientName}, here’s the detailed ${SHIFT_NAMES[review.shift].toLowerCase()} shift handoff from Jamison.\n\n${context.focus}\n\nShift snapshot:\n• Completed: ${review.completed.length} of ${review.tasks.length}\n• Delayed: ${review.delayed.length}\n• Carried forward: ${review.carried.length}\n• Still watching: ${review.open.length}\n\nCompleted / moved forward:\n${completedSummary(review, 10)}\n\nDelayed, carried, or still watching:\n${followupSummary(review, 10)}\n\nPriority used:\n• Customer-facing and safety items first\n• Time-sensitive admin next\n• Anything unfinished documented instead of left vague\n\n${context.closing}`;
}

function buildIssueMessage(review, prefs, seed, recipientName, context) {
  const issueLine = review.delayed.length || review.carried.length || review.open.length
    ? "The main thing to note is that some work needed a later window, so I documented the reason/status instead of leaving it unclear."
    : "No major issue is standing out from the planned list right now.";
  return `${context.greeting} ${dayPart()} ${recipientName}, follow-up focused update from Jamison.\n\n${issueLine}\n\nItems needing attention:\n${followupSummary(review, 12)}\n\nCompleted items for context:\n${completedSummary(review, 6)}\n\nOperational note:\n${context.focus}\n\n${context.closing}`;
}

function buildPositiveMessage(review, prefs, seed, recipientName, context) {
  return `${context.greeting} ${dayPart()} ${recipientName}, ${pick(["I wanted to send a quick sincere update", "here’s a clean shift update", "I’m sending today’s handoff"], seed, 11)} from Jamison.\n\n${context.focus}\n\nWhat went well:\n${completedSummary(review, 7)}\n\nWhat still needs a window:\n${followupSummary(review, 6)}\n\nOverall, I tried to keep the shift moving by handling the highest-impact items first and documenting anything that could not be finished cleanly.\n\n${context.closing}`;
}

function buildMessage(review) {
  const prefs = readJSON(TEMPLATE_REVIEW.handoffPrefs, { recipient: "loretta", tone: "positive" });
  const recipientName = RECIPIENTS[prefs.recipient] || "Loretta";
  const seed = reviewSeed(review, prefs);
  const context = recipientContext(prefs.recipient, seed);

  if (prefs.tone === "quick") return buildQuickMessage(review, prefs, seed, recipientName, context);
  if (prefs.tone === "detailed") return buildDetailedMessage(review, prefs, seed, recipientName, context);
  if (prefs.tone === "issue") return buildIssueMessage(review, prefs, seed, recipientName, context);
  return buildPositiveMessage(review, prefs, seed, recipientName, context);
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
  content.innerHTML = `<article class="review-card"><div class="screen-header"><div><p class="eyebrow">END OF DAY REVIEW</p><h3>Daily handoff</h3></div><span class="badge">${SHIFT_NAMES[review.shift]}</span></div><div class="review-grid">${stat("Done", review.completed.length)}${stat("Delayed", review.delayed.length)}${stat("Carry", review.carried.length)}${stat("Watch", review.open.length)}</div><div class="review-section handoff-options"><h4>Handoff options</h4><p class="helper-text">Choose who this is going to and how direct it should feel. Refresh gives you a different sincere version without changing the facts.</p><div class="handoff-option-grid"><label>Send to<select id="handoff-recipient">${option("loretta", "Loretta", prefs.recipient)}${option("richard", "Richard", prefs.recipient)}${option("both", "Both", prefs.recipient)}</select></label><label>Tone<select id="handoff-tone">${option("quick", "Quick", prefs.tone)}${option("detailed", "Detailed", prefs.tone)}${option("issue", "Issue-focused", prefs.tone)}${option("positive", "Positive / sincere", prefs.tone)}</select></label></div></div>${list("Completed", review.completed)}${list("Delayed", review.delayed, review.states)}${list("Carry Forward", review.carried, review.states)}${list("Still Watching", review.open)}<div class="review-section"><h4>Editable message</h4><textarea class="review-message-box" id="review-message">${escapeHTML(message)}</textarea><div class="review-actions"><button class="primary-action" id="share-review" type="button">Text / Share</button><button class="secondary-action" id="copy-review" type="button">Copy</button><button class="secondary-action" id="refresh-review" type="button">Refresh Message</button></div></div></article>`;
  document.querySelector("#handoff-recipient")?.addEventListener("change", savePrefsAndRefresh);
  document.querySelector("#handoff-tone")?.addEventListener("change", savePrefsAndRefresh);
  document.querySelector("#refresh-review")?.addEventListener("click", refreshVariantAndRender);
  document.querySelector("#copy-review")?.addEventListener("click", () => copyText(document.querySelector("#review-message")?.value || message));
  document.querySelector("#share-review")?.addEventListener("click", () => shareText(document.querySelector("#review-message")?.value || message));
}

function refreshVariantAndRender() {
  localStorage.setItem(TEMPLATE_REVIEW.handoffVariant, JSON.stringify(readJSON(TEMPLATE_REVIEW.handoffVariant, 0) + 1));
  renderTemplateAwareReview();
}

function savePrefsAndRefresh() {
  localStorage.setItem(TEMPLATE_REVIEW.handoffPrefs, JSON.stringify({ recipient: document.querySelector("#handoff-recipient")?.value || "loretta", tone: document.querySelector("#handoff-tone")?.value || "positive" }));
  refreshVariantAndRender();
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
