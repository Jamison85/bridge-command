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
function markDelay(id) { const reason = prompt("Why is this delayed?", "Register coverage / customer rush / short staffed / lower priority today") || "Reason noted"; const st = states(); st[id] = { type: "delayed", reason, updatedAt: new Date().toISOString() }; setStates(st); renderV2(); }
function markCarry(id) { const reason = prompt("Carry forward note", "Next shift") || "Next shift"; const st = states(); st[id] = { type: "carry", reason, updatedAt: new Date().toISOString() }; setStates(st); renderV2(); }
function reopen(id) { const st = states(); delete st[id]; setStates(st); setCompletedIds(completedIds().filter((doneId) => doneId !== id)); renderV2(); }

function progressText(d = data()) {
  const documented = d.delayed.length + d.carried.length;
  const open = d.active.length;
  return `${d.completed.length} done · ${documented} documented · ${open} open`;
}

function priorityLabel(d = data()) {
  const text = d.unfinished.map((task) => `${task.title} ${task.area} ${d.states[task.id]?.reason || ""}`).join(" ").toLowerCase();
  if (/safety|unsafe|injury|accident|spill|wet floor|outage|system down|register down|pos down|food safety|temperature|cooler down|freezer down|staffing crisis|short staffed|call out|alone|incident|security|police|medical/.test(text)) return "Red";
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
    <header class="v2-top"><button class="v2-menu" type="button">☰</button><div><p>CASEY'S</p><h1>Store Pilot</h1></div><span>${priorityLabel(d)}</span></header>
    <section class="v2-shifts">${V2_ORDER.map((shift) => `<button class="${shift === activeShift() ? "active" : ""}" data-v2-shift="${shift}" type="button">${V2_SHIFT_LABELS[shift]}</button>`).join("")}</section>
    <section class="v2-stage">${v2Screen === "now" ? nowHTML(d) : v2Screen === "tasks" ? tasksHTML(d) : v2Screen === "handoff" ? handoffHTML(d) : incidentHTML(d)}</section>
    <nav class="v2-nav">${[["now","Now"],["tasks","Tasks"],["handoff","Handoff"],["incident","Incident"]].map(([id,label]) => `<button class="${v2Screen === id ? "active" : ""}" data-v2-screen="${id}" type="button">${label}</button>`).join("")}</nav>`;
  bindV2();
}

function nowHTML(d) {
  const next = d.next;
  return `<article class="v2-now">
    <div class="v2-kicker"><span>${V2_SHIFT_LABELS[activeShift()]} Shift</span><b>${priorityLabel(d)}</b></div>
    <h2>${escape(next?.title || "Ready for handoff")}</h2>
    <p>${escape(taskWhy(next))}</p>
    <div class="v2-actions">${next ? `<button data-v2-done="${next.id}">Done</button><button data-v2-delay="${next.id}">Delay</button><button data-v2-carry="${next.id}">Carry</button>` : `<button data-v2-screen="handoff">Review Handoff</button>`}</div>
    <div class="v2-progress"><span>${progressText(d)}</span></div>
  </article>`;
}

function taskItem(task, status, d) {
  const note = d.states[task.id]?.reason;
  return `<article class="v2-task"><div><strong>${escape(task.title)}</strong><span>${escape(task.area)} · ${task.minutes} min${note ? ` · ${escape(note)}` : ""}</span></div><em>${status}</em><div>${status === "Done" ? `<button data-v2-reopen="${task.id}">Reopen</button>` : `<button data-v2-done="${task.id}">Done</button><button data-v2-delay="${task.id}">Delay</button><button data-v2-carry="${task.id}">Carry</button>`}</div></article>`;
}

function group(title, items, status, d) {
  return `<section class="v2-group"><h3>${title}</h3>${items.length ? items.map((task) => taskItem(task, status, d)).join("") : `<p class="v2-empty">Nothing here.</p>`}</section>`;
}

function tasksHTML(d) {
  return `${group("Now", d.active, "Open", d)}${group("Documented", [...d.delayed, ...d.carried], "Documented", d)}${group("Done", d.completed, "Done", d)}`;
}

function handoffHTML(d) {
  return `<article class="v2-handoff"><h2>Daily handoff</h2><div class="v2-stats"><b>${d.completed.length}<span>done</span></b><b>${d.delayed.length}<span>delayed</span></b><b>${d.carried.length}<span>carried</span></b><b>${d.active.length}<span>open</span></b></div><textarea id="v2-message">${escape(buildMessage(d))}</textarea><div class="v2-actions"><button id="v2-share">Text / Share</button><button id="v2-copy">Copy</button><button id="v2-version">New Version</button></div></article>`;
}

function incidentHTML() {
  return `<form class="v2-incident" id="v2-incident-form"><h2>Incident note</h2><label>What happened<textarea name="what" placeholder="Power outage, short staffed, tech support call..."></textarea></label><label>Who was notified<input name="who" placeholder="Loretta, Richard, IT, maintenance..." /></label><label>What got delayed<textarea name="delayed" placeholder="Bookwork, dates, cleaning, truck, etc."></textarea></label><button type="submit">Save incident note</button></form>`;
}

function bindV2() {
  document.querySelectorAll("[data-v2-shift]").forEach((b) => b.addEventListener("click", () => setShift(b.dataset.v2Shift)));
  document.querySelectorAll("[data-v2-screen]").forEach((b) => b.addEventListener("click", () => { v2Screen = b.dataset.v2Screen; renderV2(); }));
  document.querySelectorAll("[data-v2-done]").forEach((b) => b.addEventListener("click", () => markDone(b.dataset.v2Done)));
  document.querySelectorAll("[data-v2-delay]").forEach((b) => b.addEventListener("click", () => markDelay(b.dataset.v2Delay)));
  document.querySelectorAll("[data-v2-carry]").forEach((b) => b.addEventListener("click", () => markCarry(b.dataset.v2Carry)));
  document.querySelectorAll("[data-v2-reopen]").forEach((b) => b.addEventListener("click", () => reopen(b.dataset.v2Reopen)));
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
  style.textContent = `html.v2-clean-active body{background:linear-gradient(180deg,#fff9ef,#efe5d5)!important}html.v2-clean-active .app-shell{display:none!important}#store-pilot-v2{width:min(100%,760px);min-height:100dvh;margin:0 auto;padding:calc(env(safe-area-inset-top) + 12px) 14px calc(env(safe-area-inset-bottom) + 92px);color:#17221c;font-family:Inter,system-ui,sans-serif}.v2-top{display:grid;grid-template-columns:44px 1fr auto;align-items:center;gap:10px;margin-bottom:12px}.v2-top button{height:44px;border:0;border-radius:16px;background:#fffaf1;color:#073f2f;font-weight:1000;box-shadow:0 8px 22px rgba(44,31,16,.08)}.v2-top p{margin:0;text-align:center;color:#073f2f;font-size:.64rem;font-weight:1000;letter-spacing:.18em}.v2-top h1{margin:0;text-align:center;color:#073f2f;font-size:1.45rem;line-height:1;text-transform:uppercase}.v2-top span{padding:10px 13px;border-radius:999px;background:#e8eee3;color:#073f2f;font-weight:950;font-size:.78rem}.v2-shifts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:9px;margin-bottom:12px;border:1px solid rgba(63,48,31,.12);border-radius:22px;background:rgba(255,250,241,.9);box-shadow:0 14px 34px rgba(44,31,16,.1)}.v2-shifts button,.v2-nav button{min-height:44px;border:0;border-radius:16px;background:transparent;color:#6d675e;font-weight:950}.v2-shifts button.active,.v2-nav button.active{background:linear-gradient(180deg,#0f513d,#073f2f);color:#fff}.v2-stage{display:grid;gap:12px}.v2-now,.v2-handoff,.v2-incident,.v2-group{padding:20px;border:1px solid rgba(63,48,31,.12);border-radius:26px;background:rgba(255,250,241,.94);box-shadow:0 18px 46px rgba(44,31,16,.13)}.v2-kicker{display:flex;justify-content:space-between;gap:10px;color:#8b4e1f;font-weight:950;text-transform:uppercase;font-size:.72rem;letter-spacing:.08em}.v2-now h2,.v2-handoff h2,.v2-incident h2{margin:18px 0 8px;color:#073f2f;font-size:2rem;line-height:.98;letter-spacing:-.05em}.v2-now p{margin:0;color:#6d675e;font-size:1rem;line-height:1.35}.v2-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px}.v2-actions button,.v2-task button,.v2-incident button{min-height:48px;border:0;border-radius:16px;background:#e9eee6;color:#073f2f;font-weight:1000}.v2-actions button:first-child,.v2-incident button{background:linear-gradient(180deg,#d29352,#b87336);color:white}.v2-progress{margin-top:16px;padding:13px;border-radius:18px;background:#eef2e9;color:#073f2f;font-weight:950}.v2-group h3{margin:0 0 12px;color:#073f2f}.v2-task{display:grid;gap:10px;padding:14px;border:1px solid rgba(63,48,31,.1);border-radius:18px;background:#fffdf8;margin-top:10px}.v2-task strong{display:block;color:#17221c}.v2-task span{display:block;margin-top:3px;color:#6d675e;font-size:.84rem}.v2-task em{width:max-content;padding:6px 10px;border-radius:999px;background:#eef2e9;color:#073f2f;font-style:normal;font-weight:950;font-size:.72rem}.v2-task div:last-child{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.v2-empty{color:#6d675e}.v2-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}.v2-stats b{display:grid;place-items:center;padding:14px;border-radius:18px;background:#fffdf8;color:#073f2f;font-size:1.45rem}.v2-stats span{font-size:.68rem;text-transform:uppercase;color:#6d675e}#v2-message,.v2-incident textarea,.v2-incident input{width:100%;border:1px solid rgba(63,48,31,.14);border-radius:18px;background:#fffdf8;color:#17221c;padding:14px;font:inherit;line-height:1.42}#v2-message{min-height:280px}.v2-incident{display:grid;gap:12px}.v2-incident label{display:grid;gap:7px;color:#073f2f;font-weight:950}.v2-nav{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 12px);transform:translateX(-50%);width:min(calc(100% - 24px),720px);display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px;border:1px solid rgba(63,48,31,.12);border-radius:26px 26px 18px 18px;background:rgba(255,250,241,.94);box-shadow:0 14px 40px rgba(44,31,16,.18);backdrop-filter:blur(18px);z-index:999}@media(max-width:430px){#store-pilot-v2{padding-left:12px;padding-right:12px}.v2-now h2,.v2-handoff h2,.v2-incident h2{font-size:1.65rem}.v2-actions{gap:8px}.v2-stats{gap:8px}.v2-stats b{padding:11px 8px;font-size:1.2rem}}`;
  document.head.appendChild(style);
  const root = document.createElement("main");
  root.id = "store-pilot-v2";
  document.body.appendChild(root);
}

setTimeout(renderV2, 250);
