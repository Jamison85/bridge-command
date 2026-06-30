function lockHeroText() {
  const hero = document.querySelector(".hero-card");
  if (!hero) return;
  const title = hero.querySelector("#next-title");
  const copy = hero.querySelector("#next-copy");
  const shift = hero.querySelector("#shift-label");
  const date = hero.querySelector("#date-label");
  const set = (node, color) => {
    if (!node) return;
    node.style.setProperty("color", color, "important");
    node.style.setProperty("-webkit-text-fill-color", color, "important");
    node.style.setProperty("opacity", "1", "important");
    node.style.setProperty("visibility", "visible", "important");
    node.style.setProperty("text-shadow", "none", "important");
    node.style.setProperty("filter", "none", "important");
  };
  set(title, "#fffaf0");
  set(copy, "rgba(255,250,240,0.82)");
  set(shift, "rgba(255,250,240,0.78)");
  set(date, "rgba(255,250,240,0.78)");
  hero.querySelectorAll(".hero-meta span").forEach((node) => set(node, "rgba(255,250,240,0.78)"));
  hero.querySelectorAll(".eyebrow").forEach((node) => {
    if (!node.closest("#next-brain-explain")) set(node, "#f0c979");
  });
}

let lockCount = 0;
const heroLock = setInterval(() => {
  lockHeroText();
  lockCount += 1;
  if (lockCount > 80) clearInterval(heroLock);
}, 100);

document.addEventListener("click", () => setTimeout(lockHeroText, 60));
document.addEventListener("change", () => setTimeout(lockHeroText, 60));
setTimeout(lockHeroText, 50);
