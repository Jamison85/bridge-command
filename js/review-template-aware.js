const TEMPLATE_REVIEW = {
  completed: "storePilot.completed.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  taskStates: "storePilot.taskStates.v6",
  templates: "storePilot.templates.v7",
  handoffPrefs: "storePilot.handoffPrefs.v10",
  handoffVariant: "storePilot.handoffVariant.v4"
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

function hashText(text) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) hash = ((hash << 5) - hash) + text.charCodeAt(index);
  return Math.abs(hash);
}

function pick(options, seed, offset = 0) {
  return options[(hashText(seed) + offset) % options.length];
}

function rotation(count) {
  return Number(readJSON(TEMPLATE_REVIEW.handoffVariant, 0)) % count;
}

function reviewSeed(review, prefs) {
  return `${dateKey()}-${review.shift}-${prefs.recipient}-${prefs.tone}-${review.completed.length}-${review.delayed.length}-${review.carried.length}-${review.open.length}`;
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

function followupItems(review) {
  return [
    ...review.delayed.map((task) => ({ task, label: "Delayed", reason: review.states[task.id]?.reason || "reason noted" })),
    ...review.carried.map((task) => ({ task, label: "Carry forward", reason: review.states[task.id]?.reason || "next best window" })),
    ...review.open.map((task) => ({ task, label: "Still watching", reason: "not completed yet" }))
  ];
}

function lineList(items, limit, emptyText, formatter = (task) => `- ${task.title}`) {
  if (!items.length) return `- ${emptyText}`;
  const visible = items.slice(0, limit).map(formatter);
  const hidden = items.length - visible.length;
  return hidden > 0 ? `${visible.join("\n")}\n- ${hidden} more item${hidden === 1 ? "" : "s"} still listed in Store Pilot.` : visible.join("\n");
}

function inlineList(items, limit, emptyText) {
  if (!items.length) return emptyText;
  const names = items.slice(0, limit).map((task) => task.title);
  const hidden = items.length - names.length;
  return hidden > 0 ? `${names.join(", ")}, plus ${hidden} more` : names.join(", ");
}

function completedSummary(review, limit) {
  return lineList(review.completed, limit, "No completed items were checked off yet, but the shift was reviewed and follow-ups were documented.");
}

function followupSummary(review, limit) {
  const items = followupItems(review);
  return lineList(items, limit, "No major follow-ups from the planned list at this time.", (item) => `- ${item.task.title}: ${item.label}, ${item.reason}`);
}

function contextFor(recipientKey, seed) {
  if (recipientKey === "richard") {
    return {
      greeting: pick(["Good", "Hello", "Hi"], seed),
      focus: "I am keeping this focused on completion, impact, and anything that still needs a follow-up window.",
      close: pick([
        "No reply needed unless you want a different follow-up.",
        "I will keep anything still open documented for the next best window.",
        "This is mainly to keep a clear record of what was completed and what moved."
      ], seed, 3)
    };
  }
  if (recipientKey === "both") {
    return {
      greeting: pick(["Good", "Hello", "Hi"], seed),
      focus: "I wanted to give you both the same clear picture of what was handled and what still needs attention.",
      close: pick([
        "No reply needed unless either of you wants me to handle something differently.",
        "This should give both of you a clean view of where the shift landed.",
        "I will keep the remaining items documented and ready for the next best window."
      ], seed, 5)
    };
  }
  return {
    greeting: pick(["Good", "Hi", "Hey"], seed),
    focus: pick([
      "I wanted this to feel like a real update, not just a checklist dump.",
      "Here is where the shift landed so you have the honest picture without having to dig for it.",
      "I am sending the daily handoff with what got handled and what still needs a window.",
      "I wanted to keep you in the loop on what moved forward and what still needs attention."
    ], seed, 7),
    close: pick([
      "No reply needed unless you want me to adjust anything.",
      "I will keep working from the highest-impact items first.",
      "I just wanted you to have a clear and honest update from the shift.",
      "I will keep the remaining items from getting lost."
    ], seed, 9)
  };
}

function buildQuickMessage(review, prefs, seed, name, context) {
  const followups = followupItems(review);
  const styles = [
    () => `${name} - quick ${SHIFT_NAMES[review.shift].toLowerCase()} update:\n\n${review.completed.length}/${review.tasks.length} planned items are done. ${followups.length} item${followups.length === 1 ? "" : "s"} need follow-up.\n\nDone: ${inlineList(review.completed, 3, "nothing checked off yet")}\n\nFollow-up: ${inlineList(followups.map((item) => item.task), 3, "nothing major right now")}\n\n${context.close}`,
    () => `${context.greeting} ${dayPart()} ${name}, quick handoff from Jamison.\n\nMain status: ${review.completed.length} done, ${review.delayed.length} delayed, ${review.carried.length} carried, ${review.open.length} still watching.\n\nMost important completed work:\n${completedSummary(review, 3)}\n\nOnly follow-ups I would flag:\n${followupSummary(review, 3)}\n\n${context.close}`,
    () => `Quick shift note for ${name}:\n\nHandled:\n${completedSummary(review, 4)}\n\nStill needs a window:\n${followupSummary(review, 4)}\n\nI kept the focus on what mattered most for the shift and documented anything that could not be finished cleanly.`,
    () => `${name}, short version from Jamison:\n\nShift: ${SHIFT_NAMES[review.shift]}\nDone: ${review.completed.length}/${review.tasks.length}\nNeeds follow-up: ${followups.length}\n\nBiggest completed items: ${inlineList(review.completed, 4, "none checked off yet")}\n\nItems not to lose: ${inlineList(followups.map((item) => item.task), 4, "nothing major right now")}`,
    () => `Quick update: I moved the ${SHIFT_NAMES[review.shift].toLowerCase()} shift forward and documented the open items.\n\nCompleted:\n${completedSummary(review, 3)}\n\nFollow-up:\n${followupSummary(review, 3)}\n\n${context.close}`,
    () => `${context.greeting} ${dayPart()} ${name}, this is the quick version.\n\nWhat changed: ${review.completed.length} item${review.completed.length === 1 ? "" : "s"} completed, ${followups.length} follow-up item${followups.length === 1 ? "" : "s"} documented.\n\nDone now: ${inlineList(review.completed, 3, "nothing checked off yet")}\nNext window: ${inlineList(followups.map((item) => item.task), 3, "nothing major right now")}\n\n${context.close}`
  ];
  return styles[rotation(styles.length)]();
}

function buildDetailedMessage(review, prefs, seed, name, context) {
  const styles = [
    () => `${context.greeting} ${dayPart()} ${name}, detailed ${SHIFT_NAMES[review.shift].toLowerCase()} shift handoff from Jamison.\n\nStatus snapshot:\n- Completed: ${review.completed.length} of ${review.tasks.length}\n- Delayed: ${review.delayed.length}\n- Carried forward: ${review.carried.length}\n- Still watching: ${review.open.length}\n\nWork completed:\n${completedSummary(review, 10)}\n\nOpen / delayed / carried:\n${followupSummary(review, 10)}\n\nHow I prioritized it:\n- Customer-facing and safety items first\n- Time-sensitive admin next\n- Anything unfinished documented instead of left vague\n\n${context.close}`,
    () => `Detailed handoff for ${name}\nShift: ${SHIFT_NAMES[review.shift]}\nFrom: Jamison\n\n1. What got done\n${completedSummary(review, 10)}\n\n2. What changed or moved\n${followupSummary(review, 10)}\n\n3. Overall read\n${context.focus}\n\n4. Next best window\nThe remaining items are already documented so they do not get lost.\n\n${context.close}`,
    () => `${context.greeting} ${dayPart()} ${name}, here is the full shift picture.\n\nThe shift landed at ${review.completed.length}/${review.tasks.length} completed. The main work moved forward, and the items that could not be finished are separated below so the handoff is not vague.\n\nCompleted list:\n${completedSummary(review, 12)}\n\nNeeds attention next:\n${followupSummary(review, 12)}\n\nSummary: ${context.focus}\n\n${context.close}`,
    () => `End-of-shift detail for ${name}:\n\nCompleted work was:\n${completedSummary(review, 9)}\n\nThe items that need another window are:\n${followupSummary(review, 9)}\n\nI separated anything delayed or carried forward so the next person is not guessing what happened.\n\n${context.close}`,
    () => `${context.greeting} ${dayPart()} ${name}. This is the detailed status from Jamison.\n\nShift numbers:\n- Planned: ${review.tasks.length}\n- Done: ${review.completed.length}\n- Delayed: ${review.delayed.length}\n- Carry forward: ${review.carried.length}\n- Still open: ${review.open.length}\n\nCompleted / stable:\n${completedSummary(review, 8)}\n\nNeeds follow-up / next window:\n${followupSummary(review, 8)}\n\n${context.close}`,
    () => `Detailed daily handoff\nRecipient: ${name}\nShift: ${SHIFT_NAMES[review.shift]}\n\nMain progress:\n${completedSummary(review, 8)}\n\nNot finished, but documented:\n${followupSummary(review, 8)}\n\nDecision trail:\nI kept the highest-impact items in front and documented anything that could not be completed cleanly.\n\n${context.close}`
  ];
  return styles[rotation(styles.length)]();
}

function buildIssueMessage(review, prefs, seed, name, context) {
  const hasIssues = review.delayed.length || review.carried.length || review.open.length;
  const issueLead = hasIssues ? "Some items needed a later window, so I documented the status instead of leaving them in the active list." : "No major issue is standing out from the planned list right now.";
  const styles = [
    () => `Follow-up / issue update for ${name}\n\nMain concern:\n${issueLead}\n\nNeeds attention first:\n${followupSummary(review, 12)}\n\nCompleted for context:\n${completedSummary(review, 5)}\n\n${context.close}`,
    () => `${context.greeting} ${dayPart()} ${name}, this is the issue-first handoff from Jamison.\n\nWhat may affect the next window:\n${followupSummary(review, 12)}\n\nWhat was still handled:\n${completedSummary(review, 6)}\n\nImpact note:\n${hasIssues ? "The important part is that unfinished work is documented with status instead of being hidden in the checklist." : "No major blocker is currently documented."}\n\n${context.close}`,
    () => `Heads-up update for ${name}:\n\nItems that need attention:\n${followupSummary(review, 12)}\n\nWhy I am flagging it:\n${hasIssues ? "These are the items most likely to matter after this shift because they are delayed, carried, or still open." : "There is not much to flag right now, but I am still sending the status for the record."}\n\nCompleted items:\n${completedSummary(review, 6)}\n\n${context.close}`,
    () => `Issue-first shift note\n\nPossible impact:\n${issueLead}\n\nOpen items / follow-up list:\n${followupSummary(review, 10)}\n\nProgress made despite that:\n${completedSummary(review, 5)}\n\n${context.close}`,
    () => `${name}, I want to flag the follow-up items first.\n\nNeeds another window:\n${followupSummary(review, 10)}\n\nContext on what did get done:\n${completedSummary(review, 6)}\n\nReason for sending this version: the unfinished items are the part most likely to matter after this shift.`,
    () => `Operational follow-up from Jamison\n\nPriority concern:\n${hasIssues ? inlineList(followupItems(review).map((item) => item.task), 5, "nothing major") : "No major blocker documented"}\n\nDetails:\n${followupSummary(review, 10)}\n\nCompleted so far:\n${completedSummary(review, 5)}\n\n${context.close}`
  ];
  return styles[rotation(styles.length)]();
}

function buildPositiveMessage(review, prefs, seed, name, context) {
  const loretta = prefs.recipient === "loretta";
  const styles = [
    () => `${context.greeting} ${dayPart()} ${name}, ${loretta ? "I wanted to send you a sincere daily handoff" : "here is the positive shift handoff"} from Jamison.\n\n${context.focus}\n\nWhat moved forward today:\n${completedSummary(review, 7)}\n\nWhat still needs a window:\n${followupSummary(review, 6)}\n\nOverall, I kept the shift moving by handling the highest-impact items first and documenting anything that could not be finished cleanly.\n\n${context.close}`,
    () => `${name}, here is where I landed today.\n\nI got ${review.completed.length} of ${review.tasks.length} planned items completed. The best wins were:\n${completedSummary(review, 5)}\n\nThe things I do not want to get lost are:\n${followupSummary(review, 5)}\n\n${loretta ? "I know these days can get pulled in a dozen directions, so I tried to keep this honest and useful instead of just making it sound pretty." : context.focus}\n\n${context.close}`,
    () => `${context.greeting} ${dayPart()} ${name}. Before I wrap this up, here is the honest shift picture.\n\nHandled well:\n${completedSummary(review, 6)}\n\nStill open, but documented:\n${followupSummary(review, 6)}\n\nThe main thing is that the shift did move forward, and the unfinished items have a clear status instead of being left vague.\n\n${context.close}`,
    () => `Daily handoff for ${name}\n\nWhat I focused on:\n${inlineList(review.completed, 4, "keeping the shift stable and documenting follow-ups")}\n\nWhat still needs attention:\n${inlineList(followupItems(review).map((item) => item.task), 4, "nothing major from the planned list")}\n\nMore detail:\n${completedSummary(review, 6)}\n\nFollow-up detail:\n${followupSummary(review, 6)}\n\n${context.close}`,
    () => `${context.greeting} ${dayPart()} ${name}, I wanted to give you a clean end-of-shift picture.\n\nThe shift moved forward in these areas:\n${completedSummary(review, 6)}\n\nThe items I am keeping visible are:\n${followupSummary(review, 5)}\n\n${loretta ? "I am trying to make sure the handoff is useful and not just another vague update." : "This is meant to keep the status clear without overloading the message."}\n\n${context.close}`,
    () => `${name}, quick sincere wrap-up from Jamison.\n\nToday I focused on keeping the shift moving and making sure anything unfinished had a clear note attached to it.\n\nCompleted / moved forward:\n${completedSummary(review, 5)}\n\nStill needs a window:\n${followupSummary(review, 5)}\n\n${context.close}`,
    () => `Warm daily update for ${name}:\n\nI do not want the shift to look cleaner on paper than it actually was, so here is the real status.\n\nDone:\n${completedSummary(review, 6)}\n\nNot forgotten:\n${followupSummary(review, 6)}\n\nI kept the focus on what would matter most to the store first.`,
    () => `${context.greeting} ${dayPart()} ${name}, here is the end result from my side.\n\nBest progress:\n${inlineList(review.completed, 5, "the shift was reviewed and follow-ups were documented")}\n\nStill on the radar:\n${inlineList(followupItems(review).map((item) => item.task), 5, "nothing major from the planned list")}\n\nDetails if helpful:\n${completedSummary(review, 5)}\n\nFollow-ups:\n${followupSummary(review, 5)}\n\n${context.close}`
  ];
  return styles[rotation(styles.length)]();
}

function buildMessage(review) {
  const prefs = readJSON(TEMPLATE_REVIEW.handoffPrefs, { recipient: "loretta", tone: "positive" });
  const recipientName = RECIPIENTS[prefs.recipient] || "Loretta";
  const seed = reviewSeed(review, prefs);
  const context = contextFor(prefs.recipient, seed);
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
  content.innerHTML = `<article class="review-card"><div class="screen-header"><div><p class="eyebrow">END OF DAY REVIEW</p><h3>Daily handoff</h3></div><span class="badge">${SHIFT_NAMES[review.shift]}</span></div><div class="review-grid">${stat("Done", review.completed.length)}${stat("Delayed", review.delayed.length)}${stat("Carry", review.carried.length)}${stat("Watch", review.open.length)}</div><div class="review-section handoff-options"><h4>Handoff options</h4><p class="helper-text">Choose the recipient and tone. Refresh cycles through different message versions inside the same tone while keeping the facts accurate.</p><div class="handoff-option-grid"><label>Send to<select id="handoff-recipient">${option("loretta", "Loretta", prefs.recipient)}${option("richard", "Richard", prefs.recipient)}${option("both", "Both", prefs.recipient)}</select></label><label>Tone<select id="handoff-tone">${option("quick", "Quick text", prefs.tone)}${option("detailed", "Detailed handoff", prefs.tone)}${option("issue", "Issue-first", prefs.tone)}${option("positive", "Warm daily", prefs.tone)}</select></label></div></div>${list("Completed", review.completed)}${list("Delayed", review.delayed, review.states)}${list("Carry Forward", review.carried, review.states)}${list("Still Watching", review.open)}<div class="review-section"><h4>Editable message</h4><textarea class="review-message-box" id="review-message">${escapeHTML(message)}</textarea><div class="review-actions"><button class="primary-action" id="share-review" type="button">Text / Share</button><button class="secondary-action" id="copy-review" type="button">Copy</button><button class="secondary-action" id="refresh-review" type="button">Refresh Message</button></div></div></article>`;
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
