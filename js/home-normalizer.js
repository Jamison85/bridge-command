function homeText(taskTitle) {
  const title = String(taskTitle || "").trim() || "Next task";
  if (/closing walk|walk and recovery/i.test(title)) {
    return "Best next: finish the closing walk, catch customer-facing issues, then document anything that has to wait.";
  }
  return "Best next: handle the current focus item, then document anything that has to wait.";
}

function normalizeHome() {
  const contextCard = document.querySelector("#context-engine-card");
  const contextPill = document.querySelector(".context-risk-pill");
  const nextTitle = document.querySelector("#next-title")?.textContent?.trim() || "";
  const heroCopy = document.querySelector("#next-copy");

  const realRedWords = /outage|register|system|incident|wet|water|lock|delayed|carried/i;
  const pageText = document.body?.innerText || "";
  const realRed = realRedWords.test(pageText) && !/closing walk and recovery/i.test(nextTitle);

  if (!realRed) {
    if (contextCard) contextCard.dataset.risk = "yellow";
    if (contextPill && /red priority|needs attention/i.test(contextPill.textContent || "")) {
      contextPill.textContent = "Watch";
    }
    document.querySelectorAll("[data-risk='red']").forEach((node) => {
      if (node.id === "context-engine-card" || node.id === "command-detail-card") node.dataset.risk = "yellow";
    });
  }

  if (heroCopy && /operations item open|protects operations or documentation|leadership-visible/i.test(heroCopy.textContent || "")) {
    heroCopy.textContent = homeText(nextTitle);
  }
}

document.addEventListener("click", () => setTimeout(normalizeHome, 120));
document.addEventListener("change", () => setTimeout(normalizeHome, 120));
setInterval(normalizeHome, 300);
setTimeout(normalizeHome, 150);
setTimeout(normalizeHome, 900);
