const SHELL_SCREENS = new Set(["next", "tasks", "report", "log", "templates"]);

export function normalizeShellScreen(value) {
  const screen = String(value || "").trim().toLowerCase();
  return SHELL_SCREENS.has(screen) ? screen : "next";
}

export function shellPolicy(value) {
  const screen = normalizeShellScreen(value);
  const isNext = screen === "next";
  const showQuickCapture = screen === "tasks";
  return {
    screen,
    showDashboard: isNext,
    showPrimaryShiftControls: isNext,
    showSecondaryStrip: !isNext,
    showQuickCapture,
    safeAreaMode: showQuickCapture ? "capture" : "standard"
  };
}

export function screenFromTitle(value) {
  const title = String(value || "").trim().toLowerCase();
  if (/template|setting|backup|diagnostic|maintenance/.test(title)) return "templates";
  if (/incident|report/.test(title)) return "report";
  if (/task|checklist/.test(title)) return "tasks";
  if (/log|review|end-of-day|history/.test(title)) return "log";
  return "next";
}