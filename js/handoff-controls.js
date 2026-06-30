function styleVersionButton(button) {
  button.style.background = "#fff4df";
  button.style.color = "#43260f";
  button.style.border = "1px solid rgba(184, 115, 54, 0.45)";
  button.style.boxShadow = "0 10px 24px rgba(184, 115, 54, 0.14)";
  button.style.fontWeight = "950";
  button.style.minHeight = "44px";
}

function enhanceHandoffControls() {
  const logActive = document.querySelector('[data-screen="log"]')?.classList.contains("active");
  if (!logActive) return;

  const refresh = document.querySelector("#refresh-review");
  const options = document.querySelector(".handoff-options");
  if (!refresh || !options) return;

  refresh.textContent = "New Message Version";
  styleVersionButton(refresh);

  if (document.querySelector("#handoff-new-version")) {
    styleVersionButton(document.querySelector("#handoff-new-version"));
    return;
  }

  const topButton = document.createElement("button");
  topButton.id = "handoff-new-version";
  topButton.className = "secondary-action";
  topButton.type = "button";
  topButton.textContent = "New Message Version";
  styleVersionButton(topButton);
  topButton.addEventListener("click", () => refresh.click());
  options.appendChild(topButton);
}

import("./stability-intelligence.js").catch((error) => console.warn("Store Pilot stabilization layer failed", error));
document.addEventListener("click", () => setTimeout(enhanceHandoffControls, 80));
document.addEventListener("change", () => setTimeout(enhanceHandoffControls, 80));
setInterval(enhanceHandoffControls, 900);
setTimeout(enhanceHandoffControls, 300);
