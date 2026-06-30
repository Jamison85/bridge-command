function enhanceHandoffControls() {
  const logActive = document.querySelector('[data-screen="log"]')?.classList.contains("active");
  if (!logActive) return;

  const refresh = document.querySelector("#refresh-review");
  const options = document.querySelector(".handoff-options");
  if (!refresh || !options) return;

  refresh.textContent = "New Message Version";

  if (document.querySelector("#handoff-new-version")) return;
  const topButton = document.createElement("button");
  topButton.id = "handoff-new-version";
  topButton.className = "secondary-action";
  topButton.type = "button";
  topButton.textContent = "New Message Version";
  topButton.addEventListener("click", () => refresh.click());
  options.appendChild(topButton);
}

document.addEventListener("click", () => setTimeout(enhanceHandoffControls, 80));
document.addEventListener("change", () => setTimeout(enhanceHandoffControls, 80));
setInterval(enhanceHandoffControls, 900);
setTimeout(enhanceHandoffControls, 300);
