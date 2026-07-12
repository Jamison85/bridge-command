let nativeBriefingObserver = null;
let nativeBriefingQueued = false;

function nativeEscape(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));
}

function collectBriefingModel(card) {
  const title = card.querySelector("#shift-briefing-title")?.textContent?.trim() || "Shift briefing";
  const lead = card.querySelector(".shift-briefing-lead")?.textContent?.trim() || "Review the shift and start with the highest-impact task.";
  const risk = card.querySelector(".shift-briefing-head-actions > span")?.textContent?.trim() || "Controlled";
  const facts = [...card.querySelectorAll(".shift-briefing-facts span")]
    .map((node) => node.textContent?.trim() || "")
    .filter((value) => value && !/^0\s+(deadline|loretta)/i.test(value));
  const priorities = [...card.querySelectorAll(".briefing-priority-row")].map((row) => ({
    title: row.querySelector("strong")?.textContent?.trim() || "Shift task",
    meta: row.querySelector("small")?.textContent?.trim() || "Shift"
  }));
  const alerts = [...card.querySelectorAll(".briefing-alert")].map((alert) => ({
    tone: alert.dataset.tone || "normal",
    title: alert.querySelector("strong")?.textContent?.trim() || "Heads up",
    detail: alert.querySelector("span")?.textContent?.trim() || ""
  }));
  const context = {
    title: card.querySelector(".shift-briefing-context-line strong")?.textContent?.trim() || "Normal · Manager",
    detail: card.querySelector(".shift-briefing-context-line span")?.textContent?.trim() || "Normal staffing"
  };
  return { title, lead, risk, facts, priorities, alerts, context };
}

function priorityRows(model) {
  if (!model.priorities.length) {
    return `<div class="command-empty"><strong>No active priorities.</strong><span>Review documented items and protect the handoff.</span></div>`;
  }
  return model.priorities.map((item, index) => `
    <article class="command-coming-row briefing-native-row${index === 0 ? " active" : ""}">
      <span>${index + 1}</span>
      <div>
        <strong>${nativeEscape(item.title)}</strong>
        <small>${nativeEscape(item.meta)}</small>
      </div>
    </article>`).join("");
}

function alertRows(model) {
  if (!model.alerts.length) {
    return `<div class="command-empty"><strong>No major warnings.</strong><span>No active incidents, deadlines, dated notes, or carryover found.</span></div>`;
  }
  return model.alerts.map((item) => `
    <article class="briefing-native-alert" data-tone="${nativeEscape(item.tone)}">
      <strong>${nativeEscape(item.title)}</strong>
      ${item.detail ? `<span>${nativeEscape(item.detail)}</span>` : ""}
    </article>`).join("");
}

function rebuildBriefingCard() {
  const card = document.querySelector(".shift-briefing-card");
  if (!card || card.querySelector(".briefing-native-shell")) return;

  const model = collectBriefingModel(card);
  const riskKey = /attention|critical/i.test(model.risk) ? "critical" : /watch/i.test(model.risk) ? "watch" : "controlled";
  card.className = "shift-briefing-card screen-card briefing-native-card";
  card.innerHTML = `
    <div class="briefing-native-shell">
      <header class="screen-header briefing-native-header">
        <div>
          <p class="eyebrow">SHIFT BRIEFING</p>
          <h2 id="shift-briefing-title">${nativeEscape(model.title)}</h2>
        </div>
        <button class="text-button" type="button" data-native-briefing-close>Close</button>
      </header>

      <section class="hero-card briefing-native-hero" data-risk="${riskKey}">
        <div class="hero-meta"><span>START HERE</span><span>${nativeEscape(model.risk)}</span></div>
        <h2>${nativeEscape(model.lead)}</h2>
        <div class="command-metrics briefing-native-facts">
          ${model.facts.map((fact) => `<span>${nativeEscape(fact)}</span>`).join("")}
        </div>
      </section>

      <section class="command-coming-card briefing-native-priorities">
        <div class="command-section-head">
          <div><p>PRIORITIES</p><h3>First three moves</h3></div>
          <button type="button" data-native-briefing-tasks>All tasks</button>
        </div>
        <div class="command-coming-list">${priorityRows(model)}</div>
      </section>

      <details class="command-rescue briefing-native-heads-up" ${riskKey === "critical" ? "open" : ""}>
        <summary><span>HEADS UP</span><strong>${model.alerts.length ? `${model.alerts.length} item${model.alerts.length === 1 ? "" : "s"} can change the plan` : "Nothing major waiting"}</strong></summary>
        <div class="briefing-native-alert-list">${alertRows(model)}</div>
      </details>

      <div class="command-context-summary briefing-native-context">
        <div><p>SHIFT CONTEXT</p><strong>${nativeEscape(model.context.title)}</strong><span>${nativeEscape(model.context.detail)}</span></div>
      </div>

      <div class="command-inline-actions briefing-native-actions">
        <button class="primary-action" type="button" data-native-briefing-start>Start shift</button>
        <button class="secondary-action command-light-button" type="button" data-native-briefing-tasks>View tasks</button>
      </div>
    </div>`;

  card.querySelector("[data-native-briefing-close]")?.addEventListener("click", () => window.StorePilotShiftBriefing?.close?.(true));
  card.querySelector("[data-native-briefing-start]")?.addEventListener("click", () => window.StorePilotShiftBriefing?.close?.(true));
  card.querySelectorAll("[data-native-briefing-tasks]").forEach((button) => button.addEventListener("click", () => {
    window.StorePilotShiftBriefing?.close?.(true);
    document.querySelector('[data-screen="tasks"]')?.click();
  }));
}

function queueNativeBriefing() {
  if (nativeBriefingQueued) return;
  nativeBriefingQueued = true;
  requestAnimationFrame(() => {
    nativeBriefingQueued = false;
    rebuildBriefingCard();
  });
}

function observeNativeBriefing() {
  if (nativeBriefingObserver) return;
  nativeBriefingObserver = new MutationObserver(queueNativeBriefing);
  nativeBriefingObserver.observe(document.body, { childList: true, subtree: true });
}

setTimeout(() => {
  observeNativeBriefing();
  rebuildBriefingCard();
}, 360);
