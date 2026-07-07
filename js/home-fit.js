function isNextScreen() {
  return document.querySelector('[data-screen="next"]')?.classList.contains("active") !== false;
}

function applyHomeFit() {
  const nextActive = isNextScreen();
  document.documentElement.classList.toggle("home-fit", nextActive);
}

document.addEventListener("click", () => setTimeout(applyHomeFit, 80));
document.addEventListener("change", () => setTimeout(applyHomeFit, 80));
window.addEventListener("resize", applyHomeFit);
window.addEventListener("orientationchange", () => setTimeout(applyHomeFit, 150));
setInterval(applyHomeFit, 500);
setTimeout(applyHomeFit, 80);
