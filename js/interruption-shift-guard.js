document.addEventListener("click", (event) => {
  const shiftButton = event.target.closest(".shift-button");
  if (!shiftButton || shiftButton.classList.contains("active")) return;
  const active = window.StorePilotInterruptions?.getActive?.();
  if (!active) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  window.StorePilotInterruptions.open();
}, true);
