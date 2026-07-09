const V2_KEYS = {
  completed: "storePilot.completed.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  states: "storePilot.taskStates.v6",
  templates: "storePilot.templates.v7",
  reports: "storePilot.reports.v6"
};

const V2_SHIFT_LABELS = { morning: "Morning", mid: "Mid", close: "Close" };
const V2_ORDER = ["morning", "mid", "close"];
const V2_TEMPLATES = {
  morning: [
    t("bookwork", "Bookwork / SmartSafe match", "Admin", 18, "Verify SmartSafe, deposits, lottery, and starting cash."),
    t("smart-counts", "Smart Counts", "Inventory", 14, "Complete Smart Counts early while the shift is manageable."),
    t("lto", "LTO screenshot to Loretta", "Admin", 6, "Send the daily LTO screenshot.", "10:00 AM"),
    t("morning-walk", "Morning walk", "Walk", 12, "Check the store once and catch customer-facing issues."),
    t("coffee-fountain", "Coffee and fountain reset", "Guest", 12, "Cups, lids, straws, coffee area, fountain area, and BIBs."),
    t("open-air", "Open-air cooler dates", "Fresh", 12, "Check dates, face product, and rotate as needed."),
    t("food-warmers", "Food warmers check", "Fresh", 8, "Check quality, holding, labels, and presentation."),
    t("shift-note", "Morning handoff note", "Closeout", 7, "Capture what was done, what moved, and what needs follow-up.")
  ],
  mid: [
    t("mid-walk", "Mid-shift floor reset walk", "Walk", 10, "Check customer-facing areas and catch what morning could not finish."),
    t("coffee-fountain-mid", "Coffee / fountain recovery", "Guest", 10, "Refill, clean counters, and check fountain issues."),
    t("cooler-fresh-mid", "Cooler and fresh food check", "Fresh", 14, "Face open-air, check dates, and rotate issues."),
    t("restrooms-mid", "Restrooms and trash pass", "Guest", 10, "Supplies, trash, quick wipe, and customer-facing reset."),
    t("backstock-mid", "Backstock / back room quick reset", "Stock", 20, "Put out priority backstock and keep paths clear."),
    t("handoff-mid", "Mid-shift handoff note", "Closeout", 7, "Log what was done and what still needs done.")
  ],
  close: [
    t("close-walk", "Closing walk and recovery", "Walk", 12, "Check floor, restrooms, trash, cooler, coffee, fountain, and safety issues."),
    t("dates-close", "Fresh food / cooler date pass", "Fresh", 14, "Check open-air and priority fresh items."),
    t("coffee-fountain-close", "Coffee and fountain close reset", "Guest", 10, "Clean and stock for the next morning."),
    t("restrooms-close", "Restrooms, trash, and floor", "Guest", 16, "Restrooms stocked, trash handled, floors checked, and store presentable."),
    t("lock-doors", "Lock doors / closing timing", "Close", 5, "Use the store process for closing timing."),
    t("handoff-close", "Closing handoff note", "Closeout", 8, "Log what is complete, what carried forward, and any incident or delay.")
  ]
};

let v2Screen = "now";
let v2MessageVariant = 0;
let v2NoteModal = null;

function t(id, title, area, minutes, detail, due = "") { return { id, title, area, minutes, detail, due }; }
function r(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function w(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function dayKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function activeShift() { const saved = r(V2_KEYS.shift, "close"); return V2_SHIFT_LABELS[saved] ? saved : "close"; }
function shiftKey(shift = activeShift()) { return `${dayKey()}:${shift}`; }
function templates() { return r(V2_KEYS.templates, V2_TEMPLATES); }
function custom() { return r(V2_KEYS.customTasks, {})[shiftKey()] || []; }
function tasks() { return [...(templates()[activeShift()] || V2_TEMPLATES[activeShift()] || []), ...custom()]; }
function states() { return r(V2_KEYS.states, {})[shiftKey()] || {}; }
function setStates(nextStates) { const all = r(V2_KEYS.states, {}); all[shiftKey()] = nextStates; w(V2_KEYS.states, all); }
function completedIds() { return r(V2_KEYS.completed, {})[shiftKey()] || []; }
function setCompletedIds(ids) { const all = r(V2_KEYS.completed, {}); all[shiftKey()] = [...new Set(ids)]; w(V2_KEYS.completed, all); }
function escape(value) { return String(value ?? "").replace(/[&<>'"]/g, (ch) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[ch])); }

function data() {
  const allTasks = tasks();
  const done = new Set(completedIds());
  const st = states();
  const completed = allTasks.filter((task) => done.has(task.id));
  const unfinished = allTasks.filter((task) => !done.has(task.id));
  const active = unfinished.filter((task) => !st[task.id]);
  const delayed = unfinished.filter((task) => st[task.id]?.type === "delayed");
  const carried = unfinished.filter((task) => st[task.id]?.type === "carry");
  return { tasks: allTasks, completed, unfinished, active, delayed, carried, states: st, next: active[0] || null };
}

function setShift(shift) { w(V2_KEYS.shift, shift); renderV2(); }
function markDone(id) { const st = states(); delete st[id]; setStates(st); setCompletedIds([...completedIds(), id]); renderV2(); }
function markDelay(id) { openNoteModal(id, "delayed", "Why is this delayed?", "Register coverage / customer rush / short staffed / lower priority today"); }
function markCarry(id) { openNoteModal(id, "carry", "Carry forward note", "Next shift"); }
function reopen(id) { const st = states(); delete st[id]; setStates(st); setCompletedIds(completedIds().filter((doneId) => doneId !== id)); renderV2(); }

function openNoteModal(id, type, title, placeholder) {
  const task = tasks().find((item) => item.id === id);
  v2NoteModal = { id, type, title, placeholder, taskTitle: task?.title || "Task note" };
  renderV2();
  setTimeout(() => document.querySelector("#v2-note-input")?.focus(), 80);
}

function saveNoteModal() {
  if (!v2NoteModal) return;
  const reason = document.querySelector("#v2-note-input")?.value?.trim() || (v2NoteModal.type === "carry" ? "Next shift" : "Reason noted");
  const st = states();
  st[v2NoteModal.id] = { type: v2NoteModal.type, reason, updatedAt: new Date().toISOString() };
  setStates(st);
  v2NoteModal = null;
  renderV2();
}

function closeNoteModal() { v2NoteModal = null; renderV2(); }

function progressText(d = data()) {
  const documented = d.delayed.length + d.carried.length;
  const open = d.active.length;
  return `${d.completed.length} done · ${documented} documented · ${open} open`;
}

function priorityLabel(d = data()) {
  const text = d.unfinished.map((task) => `${task.title} ${task.area} ${d.states[task.id]?.reason || ""}`).join(" ").toLowerCase();
  if (/safety|unsafe|injury|accident|spill|wet floor|outage|system down|register down|pos down|food safety|temperature|cooler down|freezer down|staffing crisis|short staffed|call out|alone|incident|security|police|medical/.test(text)) return "Urgent";
  if (d.unfinished.length) return "Watch";
  return "Clear";
}

function taskWhy(task) {
  if (!task) return "Everything active is handled or documented. Send the handoff and breathe like a person, allegedly.";
  if (/walk/i.test(task.area) || /walk/i.test(task.title)) return "Customer-facing reset before final handoff.";
  if (/handoff/i.test(task.title)) return "Protect the reality of the shift before details get fuzzy.";
  if (/fresh|cooler|food/i.test(`${task.area} ${task.title}`)) return "Freshness and standards matter before the shift gets away from you.";
  if (/bookwork|smartsafe|lto|admin/i.test(`${task.area} ${task.title}`)) return "Leadership-visible admin work needs a clean status.";
  return task.detail || "Highest open item for this shift.";
}

function buildMessage(d = data()) {
  const shift = V2_SHIFT_LABELS[activeShift()];
  const variants = [
    `Hey Loretta, quick ${shift.toLowerCase()} handoff from Jamison.\n\nCompleted:\n${lines(d.completed, 8, "Nothing checked off yet.")}\n\nDelayed / needs another window:\n${lines(d.delayed, 8, "Nothing delayed.", d)}\n\nCarried forward:\n${lines(d.carried, 8, "Nothing carried forward.", d)}\n\nSummary: ${progressText(d)}. Anything not finished was documented instead of left vague.`,
    `Loretta, here is where the ${shift.toLowerCase()} shift landed.\n\nDone:\n${lines(d.completed, 8, "No completed items marked yet.")}\n\nStill documented:\n${lines([...d.delayed, ...d.carried], 10, "No follow-ups documented.", d)}\n\nThe main point: I kept the highest-impact work moving and marked anything that needed a later window.`,
    `${shift} shift handoff from Jamison:\n\nStatus: ${progressText(d)}.\n\nCompleted work:\n${lines(d.completed, 8, "Nothing completed yet.")}\n\nFollow-up work:\n${lines([...d.delayed, ...d.carried], 10, "Nothing listed.", d)}\n\nNo reply needed unless you want me to handle something differently.`
  ];
  return variants[v2MessageVariant % variants.length];
}

function lines(items, limit, empty, d = data()) {
  if (!items.length) return `- ${empty}`;
  const shown = items.slice(0, limit).map((item) => {
    const note = d.states[item.id]?.reason;
    return `- ${item.title}${note ? ` (${note})` : ""}`;
  });
  const hidden = items.length - shown.length;
  return hidden > 0 ? `${shown.join("\n")}\n- ${hidden} more listed in Store Pilot.` : shown.join("\n");
}

function renderV2() {
  if (!document.querySelector("#store-pilot-v2")) installV2();
  const d = data();
  const shell = document.querySelector("#store-pilot-v2");
  shell.innerHTML = `
    <header class="v2-top"><button class="v2-menu" type="button" aria-label="Menu">☰</button><div><p>CASEY'S</p><h1>Store Pilot</h1></div><span class="${priorityLabel(d).toLowerCase()}">${priorityLabel(d)}</span></header>
    <section class="v2-shifts" aria-label="Shift selector">${V2_ORDER.map((shift) => `<button class="${shift === activeShift() ? "active" : ""}" data-v2-shift="${shift}" type="button">${V2_SHIFT_LABELS[shift]}</button>`).join("")}</section>
    <section class="v2-stage">${v2Screen === "now" ? nowHTML(d) : v2Screen === "tasks" ? tasksHTML(d) : v2Screen === "handoff" ? handoffHTML(d) : incidentHTML(d)}</section>
    <nav class="v2-nav">${[["now","Now"],["tasks","Tasks"],["handoff","Handoff"],["incident","Incident"]].map(([id,label]) => `<button class="${v2Screen === id ? "active" : ""}" data-v2-screen="${id}" type="button">${label}</button>`).join("")}</nav>
    ${noteModalHTML()}`;
  bindV2();
}

function nowHTML(d) {
  const next = d.next;
  return `<article class="v2-now">
    <div class="v2-kicker"><span>${V2_SHIFT_LABELS[activeShift()]} Shift</span><b>${priorityLabel(d)}</b></div>
    <h2>${escape(next?.title || "Ready for handoff")}</h2>
    <p>${escape(taskWhy(next))}</p>
    <div class="v2-actions">${next ? `<button class="primary" data-v2-done="${next.id}">Done</button><button data-v2-delay="${next.id}">Delay</button><button data-v2-carry="${next.id}">Carry</button>` : `<button class="primary" data-v2-screen="handoff">Review Handoff</button>`}</div>
    <div class="v2-progress"><span>${progressText(d)}</span></div>
  </article>`;
}

function taskItem(task, status, d) {
  const note = d.states[task.id]?.reason;
  const statusClass = status.toLowerCase();
  return `<article class="v2-task"><div><strong>${escape(task.title)}</strong><span>${escape(task.area)} · ${task.minutes} min${task.due ? ` · ${escape(task.due)}` : ""}${note ? ` · ${escape(note)}` : ""}</span></div><em class="${statusClass}">${status}</em><div>${status === "Done" ? `<button data-v2-reopen="${task.id}">Reopen</button>` : `<button class="primary" data-v2-done="${task.id}">Done</button><button data-v2-delay="${task.id}">Delay</button><button data-v2-carry="${task.id}">Carry</button>`}</div></article>`;
}

function group(title, items, status, d) {
  return `<section class="v2-group"><h3>${title}</h3>${items.length ? items.map((task) => taskItem(task, status, d)).join("") : `<p class="v2-empty">Nothing here.</p>`}</section>`;
}

function tasksHTML(d) {
  return `${group("Now", d.active, "Open", d)}${group("Documented", [...d.delayed, ...d.carried], "Documented", d)}${group("Done", d.completed, "Done", d)}`;
}

function handoffHTML(d) {
  return `<article class="v2-handoff"><h2>Daily handoff</h2><div class="v2-stats"><b>${d.completed.length}<span>done</span></b><b>${d.delayed.length}<span>delayed</span></b><b>${d.carried.length}<span>carried</span></b><b>${d.active.length}<span>open</span></b></div><textarea id="v2-message">${escape(buildMessage(d))}</textarea><div class="v2-actions"><button class="primary" id="v2-share">Text / Share</button><button id="v2-copy">Copy</button><button id="v2-version">New Version</button></div></article>`;
}

function incidentHTML() {
  return `<form class="v2-incident" id="v2-incident-form"><h2>Incident note</h2><label><span>What happened</span><textarea name="what" placeholder="Power outage, short staffed, tech support call..."></textarea></label><label><span>Who was notified</span><input name="who" placeholder="Loretta, Richard, IT, maintenance..." /></label><label><span>What got delayed</span><textarea name="delayed" placeholder="Dates, cleaning, truck, customer-facing reset, etc."></textarea></label><button class="primary" type="submit">Save incident note</button></form>`;
}

function noteModalHTML() {
  if (!v2NoteModal) return "";
  const action = v2NoteModal.type === "carry" ? "Carry forward" : "Delay task";
  return `<aside class="v2-note-modal" role="dialog" aria-modal="true" aria-label="${escape(action)}"><section><p>${escape(action)}</p><h2>${escape(v2NoteModal.taskTitle)}</h2><label><span>${escape(v2NoteModal.title)}</span><textarea id="v2-note-input" placeholder="${escape(v2NoteModal.placeholder)}"></textarea></label><div><button class="primary" id="v2-note-save" type="button">Save note</button><button id="v2-note-cancel" type="button">Cancel</button></div></section></aside>`;
}

function bindV2() {
  document.querySelectorAll("[data-v2-shift]").forEach((b) => b.addEventListener("click", () => setShift(b.dataset.v2Shift)));
  document.querySelectorAll("[data-v2-screen]").forEach((b) => b.addEventListener("click", () => { v2Screen = b.dataset.v2Screen; renderV2(); }));
  document.querySelectorAll("[data-v2-done]").forEach((b) => b.addEventListener("click", () => markDone(b.dataset.v2Done)));
  document.querySelectorAll("[data-v2-delay]").forEach((b) => b.addEventListener("click", () => markDelay(b.dataset.v2Delay)));
  document.querySelectorAll("[data-v2-carry]").forEach((b) => b.addEventListener("click", () => markCarry(b.dataset.v2Carry)));
  document.querySelectorAll("[data-v2-reopen]").forEach((b) => b.addEventListener("click", () => reopen(b.dataset.v2Reopen)));
  document.querySelector("#v2-note-save")?.addEventListener("click", saveNoteModal);
  document.querySelector("#v2-note-cancel")?.addEventListener("click", closeNoteModal);
  document.querySelector(".v2-note-modal")?.addEventListener("click", (event) => { if (event.target.classList.contains("v2-note-modal")) closeNoteModal(); });
  document.querySelector("#v2-version")?.addEventListener("click", () => { v2MessageVariant += 1; renderV2(); });
  document.querySelector("#v2-copy")?.addEventListener("click", async () => { await navigator.clipboard?.writeText(document.querySelector("#v2-message")?.value || ""); });
  document.querySelector("#v2-share")?.addEventListener("click", async () => {
    const text = document.querySelector("#v2-message")?.value || "";
    if (navigator.share) { try { await navigator.share({ title: "Shift handoff", text }); return; } catch {} }
    location.href = `sms:?&body=${encodeURIComponent(text)}`;
  });
  document.querySelector("#v2-incident-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const note = `Incident note - ${new Date().toLocaleString()}\nShift: ${V2_SHIFT_LABELS[activeShift()]}\n\nWhat happened:\n${form.get("what") || "Not listed."}\n\nWho was notified:\n${form.get("who") || "Not listed."}\n\nWork delayed:\n${form.get("delayed") || "Not listed."}`;
    const reports = r(V2_KEYS.reports, []);
    reports.push(note);
    w(V2_KEYS.reports, reports.slice(-50));
    v2Screen = "handoff";
    renderV2();
  });
}

function installV2() {
  document.documentElement.classList.add("v2-clean-active");
  const style = document.createElement("style");
  style.id = "v2-production-ui-style";
  style.textContent = `
    html.v2-clean-active body{background:#f8fafc!important;color:#0f172a!important;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}html.v2-clean-active .app-shell{display:none!important}#store-pilot-v2{width:min(100%,760px);min-height:100dvh;margin:0 auto;padding:calc(env(safe-area-inset-top) + 12px) 12px calc(env(safe-area-inset-bottom) + 92px);box-sizing:border-box;color:#0f172a}.v2-top{display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:10px;margin-bottom:10px}.v2-top button{height:42px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;color:#334155;font-weight:900}.v2-top p{margin:0;text-align:center;color:#64748b;font-size:.62rem;font-weight:900;letter-spacing:.16em}.v2-top h1{margin:0;text-align:center;color:#0f172a;font-size:1.22rem;line-height:1;text-transform:uppercase;letter-spacing:.06em}.v2-top span{padding:8px 11px;border:1px solid #e2e8f0;border-radius:999px;background:#fff;color:#334155;font-weight:900;font-size:.72rem}.v2-top span.urgent{background:#fef2f2;border-color:#fecaca;color:#991b1b}.v2-top span.watch{background:#fffbeb;border-color:#fde68a;color:#92400e}.v2-top span.clear{background:#ecfdf5;border-color:#bbf7d0;color:#065f46}.v2-shifts{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:4px;margin-bottom:12px;border:1px solid #e2e8f0;border-radius:16px;background:#fff}.v2-shifts button,.v2-nav button{min-height:40px;border:0;border-radius:12px;background:transparent;color:#64748b;font-weight:850;transition:transform .14s ease,background .14s ease,color .14s ease}.v2-shifts button:active,.v2-nav button:active{transform:scale(.97)}.v2-shifts button.active,.v2-nav button.active{background:#0f172a;color:#fff}.v2-stage{display:grid;gap:12px}.v2-now,.v2-handoff,.v2-incident,.v2-group{padding:16px;border:1px solid #e2e8f0;border-radius:16px;background:#fff;box-shadow:none}.v2-kicker{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#64748b;font-weight:900;text-transform:uppercase;font-size:.68rem;letter-spacing:.08em}.v2-kicker b{padding:6px 9px;border:1px solid #e2e8f0;border-radius:999px;background:#f8fafc;color:#334155}.v2-now h2,.v2-handoff h2,.v2-incident h2{margin:14px 0 8px;color:#0f172a;font-size:1.75rem;line-height:1;letter-spacing:-.04em}.v2-now p{margin:0;color:#475569;font-size:.98rem;line-height:1.4}.v2-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px}.v2-actions button,.v2-task button,.v2-incident button,.v2-note-modal button{min-height:44px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;color:#334155;font-weight:900}.v2-actions button.primary,.v2-task button.primary,.v2-incident button.primary,.v2-note-modal button.primary,.v2-actions button:first-child:not([id=v2-copy]):not([id=v2-version]){border-color:#047857;background:#047857;color:white}.v2-progress{margin-top:14px;padding:11px 12px;border:1px solid #dbeafe;border-radius:14px;background:#eff6ff;color:#1e3a8a;font-weight:850}.v2-group h3{margin:0 0 10px;color:#0f172a;font-size:.82rem;text-transform:uppercase;letter-spacing:.1em}.v2-task{display:grid;gap:10px;padding:13px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;margin-top:9px}.v2-task strong{display:block;color:#0f172a;font-size:1rem;line-height:1.15;font-weight:900}.v2-task span{display:block;margin-top:4px;color:#64748b;font-size:.84rem;line-height:1.25}.v2-task em{width:max-content;padding:5px 9px;border:1px solid #e2e8f0;border-radius:999px;background:#f8fafc;color:#475569;font-style:normal;font-weight:900;font-size:.68rem;text-transform:uppercase;letter-spacing:.05em}.v2-task em.done{background:#ecfdf5;border-color:#bbf7d0;color:#047857}.v2-task em.documented{background:#fffbeb;border-color:#fde68a;color:#92400e}.v2-task em.open{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}.v2-task div:last-child{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.v2-empty{margin:0;color:#64748b}.v2-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0}.v2-stats b{display:grid;place-items:center;padding:11px 7px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;color:#0f172a;font-size:1.22rem}.v2-stats span{font-size:.62rem;text-transform:uppercase;color:#64748b;letter-spacing:.06em}#v2-message,.v2-incident textarea,.v2-incident input,.v2-note-modal textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:14px;background:#fff;color:#0f172a;padding:13px;font:inherit;line-height:1.42;outline:none}#v2-message:focus,.v2-incident textarea:focus,.v2-incident input:focus,.v2-note-modal textarea:focus{border-color:#059669;box-shadow:0 0 0 3px rgba(5,150,105,.16)}#v2-message{min-height:260px}.v2-incident{display:grid;gap:12px}.v2-incident label,.v2-note-modal label{display:grid;gap:7px;color:#0f172a;font-weight:900}.v2-incident label span,.v2-note-modal label span{font-size:.76rem;text-transform:uppercase;letter-spacing:.07em;color:#475569}.v2-nav{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 12px);transform:translateX(-50%);width:min(calc(100% - 24px),720px);display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:4px;border:1px solid #e2e8f0;border-radius:18px;background:rgba(255,255,255,.92);backdrop-filter:blur(18px);z-index:999}.v2-note-modal{position:fixed;inset:0;z-index:2800;display:grid;place-items:end center;padding:14px;background:rgba(15,23,42,.42)}.v2-note-modal section{width:min(100%,520px);padding:16px;border:1px solid #e2e8f0;border-radius:18px;background:#fff;box-shadow:0 24px 60px rgba(15,23,42,.25)}.v2-note-modal p{margin:0 0 4px;color:#047857;font-size:.72rem;font-weight:900;text-transform:uppercase;letter-spacing:.1em}.v2-note-modal h2{margin:0 0 14px;color:#0f172a;font-size:1.25rem;line-height:1.1}.v2-note-modal textarea{min-height:92px}.v2-note-modal section>div{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}@media(max-width:430px){#store-pilot-v2{padding-left:10px;padding-right:10px}.v2-now h2,.v2-handoff h2,.v2-incident h2{font-size:1.45rem}.v2-actions{gap:7px}.v2-stats{gap:7px}.v2-stats b{padding:9px 6px;font-size:1.05rem}.v2-task div:last-child{grid-template-columns:1fr 1fr 1fr}.v2-actions button,.v2-task button,.v2-incident button{min-height:41px;font-size:.78rem}}
  `;
  document.head.appendChild(style);
  const root = document.createElement("main");
  root.id = "store-pilot-v2";
  document.body.appendChild(root);
}

setTimeout(renderV2, 250);
