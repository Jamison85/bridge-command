function forceReadableLtoContrast(root = document) {
  const candidates = [...root.querySelectorAll("article, button, .task-row, .task-title, .task-meta, .badge, .primary-action, .secondary-action, span, strong, p, div")];
  candidates.forEach((node) => {
    const text = (node.textContent || "").toLowerCase();
    if (!text.includes("lto") && !text.includes("loretta")) return;

    const isButton = node.matches("button, .primary-action, .secondary-action") || node.closest("button");
    const card = node.closest("article, .task-row, .screen-card, .hero-card");

    if (card) {
      card.style.color = "#14392f";
    }

    node.style.color = "#14392f";
    node.style.webkitTextFillColor = "#14392f";
    node.style.textShadow = "none";

    if (isButton) {
      const button = node.matches("button") ? node : node.closest("button");
      if (button) {
        button.style.color = "#43260f";
        button.style.webkitTextFillColor = "#43260f";
        button.style.background = "#fff4df";
        button.style.border = "1px solid rgba(184, 115, 54, 0.45)";
        button.style.fontWeight = "950";
      }
    }
  });
}

document.addEventListener("click", () => setTimeout(() => forceReadableLtoContrast(), 100));
document.addEventListener("change", () => setTimeout(() => forceReadableLtoContrast(), 100));
setInterval(forceReadableLtoContrast, 1200);
setTimeout(forceReadableLtoContrast, 400);
