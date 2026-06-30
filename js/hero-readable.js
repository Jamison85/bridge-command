function keepHeroReadable() {
  const hero = document.querySelector(".hero-card");
  if (!hero) return;
  const bright = "#fffaf0";
  const muted = "rgba(255,250,240,0.78)";
  ["#next-title"].forEach((selector) => {
    const node = hero.querySelector(selector);
    if (!node) return;
    node.style.setProperty("color", bright, "important");
    node.style.setProperty("-webkit-text-fill-color", bright, "important");
    node.style.setProperty("opacity", "1", "important");
    node.style.setProperty("text-shadow", "none", "important");
  });
  ["#next-copy", "#shift-label", "#date-label"].forEach((selector) => {
    const node = hero.querySelector(selector);
    if (!node) return;
    node.style.setProperty("color", muted, "important");
    node.style.setProperty("-webkit-text-fill-color", muted, "important");
    node.style.setProperty("opacity", "1", "important");
    node.style.setProperty("text-shadow", "none", "important");
  });
  hero.querySelectorAll(".hero-meta span").forEach((node) => {
    node.style.setProperty("color", muted, "important");
    node.style.setProperty("-webkit-text-fill-color", muted, "important");
    node.style.setProperty("opacity", "1", "important");
  });
  hero.querySelectorAll(".eyebrow").forEach((node) => {
    if (node.closest("#next-brain-explain")) return;
    node.style.setProperty("color", "#f0c979", "important");
    node.style.setProperty("-webkit-text-fill-color", "#f0c979", "important");
    node.style.setProperty("opacity", "1", "important");
  });
}

document.addEventListener("click", () => setTimeout(keepHeroReadable, 100));
document.addEventListener("change", () => setTimeout(keepHeroReadable, 100));
setInterval(keepHeroReadable, 1400);
setTimeout(keepHeroReadable, 150);
