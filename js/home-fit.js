function isNextScreen() {
  return document.querySelector('[data-screen="next"]')?.classList.contains("active") !== false;
}

function isEditingContext() {
  return Boolean(document.querySelector(".context-edit-drawer[open]"));
}

function applyHomeFit() {
  const nextActive = isNextScreen();
  const contextOpen = isEditingContext();
  document.documentElement.classList.toggle("home-fit", nextActive && !contextOpen);
  document.documentElement.classList.toggle("context-editing", contextOpen);
}

document.addEventListener("click", () => setTimeout(applyHomeFit, 80));
document.addEventListener("change", () => setTimeout(applyHomeFit, 80));
document.addEventListener("toggle", () => setTimeout(applyHomeFit, 80), true);
window.addEventListener("resize", applyHomeFit);
window.addEventListener("orientationchange", () => setTimeout(applyHomeFit, 150));
setInterval(applyHomeFit, 350);
setTimeout(applyHomeFit, 80);
