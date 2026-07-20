import "./accessibility-controller.js?v=command-center-28";
import "./state-polish.js?v=command-center-28";
import "./production-tools.js?v=command-center-28";
import "./final-nav.js?v=command-center-28";
import "./final-task-highlight.js?v=command-center-28";
import "./task-state-clarity.js?v=command-center-28";
import "./remove-handoff-task.js?v=command-center-28";
import "./shift-command-center.js?v=command-center-28";
import "./app-shell-controller.js?v=command-center-28";
import "./delete-custom-task.js?v=command-center-28";
import "./loretta-inbox.js?v=command-center-28";
import "./interruption-timer.js?v=command-center-28";
import "./interruption-shift-guard.js?v=command-center-28";
import "./loretta-away-mode.js?v=command-center-28";
import "./loretta-away-mode-guard.js?v=command-center-28";
import "./log-screen-controller.js?v=command-center-28";
import "./backup-restore.js?v=command-center-28";
import "./diagnostics.js?v=command-center-28";

window.StorePilotRuntime = {
  version: "command-center-28",
  loadedAt: new Date().toISOString(),
  eventsVersion: window.StorePilotEvents?.version || "unavailable",
  accessibilityVersion: window.StorePilotAccessibility?.version || "unavailable",
  productMode: "focused-core",
  modules: [
    "store-pilot-event-map",
    "store-pilot-events",
    "accessibility-controller",
    "incident-controller",
    "incident-state-model",
    "task-action-controller",
    "task-action-model",
    "state-polish",
    "production-tools",
    "final-nav",
    "final-task-highlight",
    "task-state-clarity",
    "remove-handoff-task",
    "shift-command-center",
    "app-shell-state-model",
    "app-shell-controller",
    "delete-custom-task",
    "loretta-inbox",
    "interruption-timer",
    "interruption-shift-guard",
    "loretta-away-mode",
    "loretta-away-mode-guard",
    "log-state-model",
    "log-screen-controller",
    "backup-restore",
    "diagnostics"
  ]
};