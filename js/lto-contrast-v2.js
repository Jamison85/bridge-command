function readable(node, color) {
  if (!node) return;
  node.style.color = color;
  node.style.webkitTextFillColor = color;
  node.style.textShadow = "none";
  node.style.opacity = "1";
}

function readableButton(button) {
  if (!button) return;
  readable(button, "#43260f");
  button.style.background = "#fff4df";
  button.style.border = "1px solid rgba(184, 115, 54, 0.45)";
  button.style.fontWeight = "950";
}

function fixLtoCard() {
  const cards = [...document.querySelectorAll("#next-brain-explain, article, .task-row, .hero-card, .screen-card")];
  cards.forEach((card) => {
    const text = (card.textContent || "").toLowerCase();
    if (!text.includes("lto") && !text.includes("loretta")) return;

    readable(card, "#14392f");
    card.querySelectorAll("p, span, strong, b, div, h1, h2, h3, h4, .eyebrow, .task-title, .task-meta").forEach((child) => {
      const childText = (child.textContent || "").toLowerCase();
      const accent = childText.includes("lto") || childText.includes("loretta") || childText.includes("store:") || childText.includes("confidence:");
      readable(child, accent ? "#7c2d12" : "#14392f");
    });
    card.querySelectorAll(".badge").forEach((badge) => {
      readable(badge, "#7c2d12");
      badge.style.background = "rgba(255,255,255,0.9)";
      badge.style.border = "1px solid rgba(124,45,18,0.12)";
    });
    card.querySelectorAll("button, .primary-action, .secondary-action").forEach(readableButton);
  });
}

document.addEventListener("click", () => setTimeout(fixLtoCard, 100));
document.addEventListener("change", () => setTimeout(fixLtoCard, 100));
setInterval(fixLtoCard, 700);
setTimeout(fixLtoCard, 150);
