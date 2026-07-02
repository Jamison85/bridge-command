function commandRiskLabel(risk) {
  return risk === "red" ? "Needs attention" : risk === "yellow" ? "Watch list" : "Controlled";
}

function getCommandAnalysis() {
  const context = window.StorePilotContextEngine?.analyze?.() || null;
  const alertData = window.StorePilotSmartAlerts?.getData?.() || null;
  const alerts = alertData && window.StorePilotSmartAlerts?.buildAlerts ? window.StorePilotSmartAlerts.buildAlerts(alertData) : [];
  const risk = alerts.some((alert) => alert.level === "red") ? "red" : alerts.some((alert) => alert.level === "warn") ? "yellow" : context?.risk || "green";
  const topAlert = alerts[0] || null;
  return { context, alertData, alerts, topAlert, risk };
}

function isNextActive() {
  return document.querySelector('[data-screen="next"]')?.classList.contains("active");
}

function compactDailyBriefing() {
  const panel = document.querySelector("#smart-alerts-panel");
  if (!panel) return;
  panel.classList.add("command-briefing-compact");
  const heading = panel.querySelector(".smart-alerts-head strong");
  const risk = panel.dataset.risk || "green";
  if (heading) {
    if (risk === "red") heading.textContent = "Handle the top risk first";
    else if (risk === "yellow") heading.textContent = "Watch this before it bites";
    else heading.textContent = "Shift looks controlled";
  }
}

function removeRedundantSmartCards() {
  document.querySelector("#next-brain-explain")?.remove();
  document.querySelector("#context-insight-card")?.remove();
  document.querySelector("#smart-alerts-next-note")?.remove();
}

function chipHTML(label) {
  return `<span class="command-chip">${escapeCommand(label)}</span>`;
}

function renderCommandDetails() {
  const content = document.querySelector("#screen-content");
  const existing = document.querySelector("#command-detail-card");
  if (!content || !isNextActive()) {
    existing?.remove();
    return;
  }

  const { context, alertData, topAlert, risk } = getCommandAnalysis();
  const nextTitle = context?.next?.title || document.querySelector("#next-title")?.textContent?.trim() || "Next best action";
  const reason = context?.reason || "This is the current best move based on open work and shift state.";
  const waits = context?.waits || "If it waits, it may become one more loose end for the handoff.";
  const alertTitle = topAlert?.title || "No major alert";
  const alertDetail = topAlert?.detail || "No major risk is currently flagged.";
  const done = context?.chips?.[0] || (alertData?.tasks?.length ? `${Math.round((alertData.completed.length / alertData.tasks.length) * 100)}% done` : "0% done");
  const open = context?.chips?.[1] || `${alertData?.open?.length || 0} open`;
  const delayed = context?.chips?.[2] || `${alertData?.delayed?.length || 0} delayed`;
  const carried = context?.chips?.[3] || `${alertData?.carried?.length || 0} carried`;
  const mode = context?.mode?.label || context?.chips?.[4] || "Normal";

  const card = existing || document.createElement("article");
  card.id = "command-detail-card";
  card.className = "command-detail-card";
  card.dataset.risk = risk;
  card.innerHTML = `
    <div class="command-detail-head">
      <div><p>WHY THIS IS NEXT</p><strong>${escapeCommand(nextTitle)}</strong></div>
      <span class="command-risk-pill">${escapeCommand(commandRiskLabel(risk))}</span>
    </div>
    <div class="command-reason-box">
      <strong>${escapeCommand(alertTitle)}</strong>
      <p>${escapeCommand(alertDetail)}</p>
      <p>${escapeCommand(reason)}</p>
    </div>
    <div class="command-chip-row">
      ${chipHTML(done)}${chipHTML(open)}${chipHTML(delayed)}${chipHTML(carried)}${chipHTML(mode)}
    </div>
    <details>
      <summary>Show deeper reasoning</summary>
      <p><b>If it waits:</b> ${escapeCommand(waits)}</p>
      <p>This combines the daily alert, shift context, task state, due time, and leadership/customer impact into one read. A shocking amount of effort to prevent one missed screenshot, but here we are.</p>
    </details>`;

  if (card.parentElement !== content) content.appendChild(card);
}

function tightenHeroCopy() {
  const heroCopy = document.querySelector("#next-copy");
  const title = document.querySelector("#next-title")?.textContent?.trim();
  const { context, topAlert, risk } = getCommandAnalysis();
  if (!heroCopy || !title) return;
  const reason = context?.reason || "This is the current best move.";
  const shortReason = reason.replace(/^Do this because it is\s*/i, "").replace(/^This is recommended because it is\s*/i, "");
  const alert = topAlert?.title ? `${topAlert.title}: ` : "";
  heroCopy.textContent = risk === "green" ? `Best move now. ${shortReason}` : `${alert}${shortReason}`;
}

function renderCommandHierarchy() {
  compactDailyBriefing();
  removeRedundantSmartCards();
  renderCommandDetails();
  tightenHeroCopy();
}

function escapeCommand(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

document.addEventListener("click", () => setTimeout(renderCommandHierarchy, 260));
document.addEventListener("change", () => setTimeout(renderCommandHierarchy, 260));
setInterval(renderCommandHierarchy, 900);
setTimeout(renderCommandHierarchy, 700);
