let compactBriefingObserver = null;
let compactBriefingQueued = false;

function compactBriefingCard() {
  const card = document.querySelector(".shift-briefing-card");
  if (!card || card.dataset.compactBriefing === "true") return;

  const headsUp = card.querySelector(".shift-briefing-section.heads-up");
  if (headsUp) {
    const alerts = headsUp.querySelectorAll(".briefing-alert");
    const list = headsUp.querySelector(".briefing-alert-list");
    const hasCritical = Boolean(headsUp.querySelector('[data-tone="critical"]'));
    const hasWatch = Boolean(headsUp.querySelector('[data-tone="watch"]'));
    const details = document.createElement("details");
    details.className = "briefing-heads-up-toggle";
    if (hasCritical) details.dataset.tone = "critical";
    else if (hasWatch) details.dataset.tone = "watch";
    else details.dataset.tone = "normal";

    details.innerHTML = `
      <summary>
        <span>
          <strong>Heads Up</strong>
          <small>${alerts.length ? `${alerts.length} item${alerts.length === 1 ? "" : "s"} can change the plan` : "No major warnings"}</small>
        </span>
        <b>${alerts.length}</b>
      </summary>`;

    if (list) details.appendChild(list);
    headsUp.replaceWith(details);
  }

  const facts = card.querySelectorAll(".shift-briefing-facts span");
  facts.forEach((fact) => {
    const value = fact.textContent?.trim() || "";
    if (/^0\s+(deadline|loretta)/i.test(value)) fact.hidden = true;
  });

  const startButton = card.querySelector("[data-briefing-start]");
  if (startButton) startButton.textContent = "Start shift";

  card.dataset.compactBriefing = "true";
}

function queueCompactBriefing() {
  if (compactBriefingQueued) return;
  compactBriefingQueued = true;
  requestAnimationFrame(() => {
    compactBriefingQueued = false;
    compactBriefingCard();
  });
}

function observeCompactBriefing() {
  if (compactBriefingObserver) return;
  compactBriefingObserver = new MutationObserver(queueCompactBriefing);
  compactBriefingObserver.observe(document.body, { childList: true, subtree: true });
}

setTimeout(() => {
  observeCompactBriefing();
  compactBriefingCard();
}, 360);
