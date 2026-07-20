const ACCESSIBILITY_RELEASE = "command-center-28";
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "[tabindex]:not([tabindex='-1'])"
].join(",");
const CLOSE_SELECTOR = [
  "[data-capture-close]",
  "[data-native-briefing-close]",
  "[data-proof-close]",
  "[data-backup-close]",
  "[data-interruption-close]",
  "[data-away-close]",
  "[data-manager-photo-close]",
  "#close-voice-sheet",
  "button[aria-label*='close' i]"
].join(",");

const registeredSheets = new WeakSet();
const sheetObservers = new WeakMap();
let bodyObserver = null;
let activeSheet = null;
let returnFocus = null;
let closingFromHistory = false;
let suppressNextPop = false;

function sheetForDialog(dialog) {
  return dialog.closest("[aria-hidden]") || dialog.parentElement;
}

function isSheetOpen(sheet) {
  return Boolean(sheet && (sheet.getAttribute("aria-hidden") === "false" || sheet.classList.contains("open")));
}

function visible(element) {
  if (!(element instanceof HTMLElement)) return false;
  if (element.hidden || element.getAttribute("aria-hidden") === "true") return false;
  const style = getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
}

function focusableElements(dialog) {
  return [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)].filter(visible);
}

function focusDialog(sheet) {
  const dialog = sheet.querySelector("[role='dialog'][aria-modal='true']");
  if (!dialog) return;
  const target = dialog.querySelector("[autofocus]")
    || dialog.querySelector(CLOSE_SELECTOR)
    || focusableElements(dialog)[0]
    || dialog;
  if (!dialog.hasAttribute("tabindex")) dialog.setAttribute("tabindex", "-1");
  requestAnimationFrame(() => {
    if (isSheetOpen(sheet) && !dialog.contains(document.activeElement)) target.focus({ preventScroll: true });
  });
}

function pushDialogHistory(sheet) {
  if (!sheet.id) sheet.id = `store-pilot-dialog-${Date.now()}`;
  if (history.state?.storePilotDialog === sheet.id) return;
  history.pushState({ ...(history.state || {}), storePilotDialog: sheet.id }, "", location.href);
}

function activateSheet(sheet) {
  if (!isSheetOpen(sheet)) return;
  if (activeSheet !== sheet) {
    if (document.activeElement instanceof HTMLElement && !sheet.contains(document.activeElement)) returnFocus = document.activeElement;
    activeSheet = sheet;
    document.body.classList.add("store-pilot-dialog-open");
    pushDialogHistory(sheet);
  }
  focusDialog(sheet);
}

function openSheets() {
  return [...document.querySelectorAll("[role='dialog'][aria-modal='true']")]
    .map(sheetForDialog)
    .filter((sheet, index, list) => sheet && isSheetOpen(sheet) && list.indexOf(sheet) === index);
}

function deactivateSheet(sheet) {
  if (activeSheet !== sheet) return;
  const remaining = openSheets().filter((item) => item !== sheet);
  activeSheet = remaining.at(-1) || null;
  if (activeSheet) {
    focusDialog(activeSheet);
    return;
  }
  document.body.classList.remove("store-pilot-dialog-open");
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  returnFocus = null;
  if (!closingFromHistory && history.state?.storePilotDialog === sheet.id) {
    suppressNextPop = true;
    history.back();
  }
}

function syncSheet(sheet) {
  if (isSheetOpen(sheet)) activateSheet(sheet);
  else deactivateSheet(sheet);
}

function registerDialog(dialog) {
  const sheet = sheetForDialog(dialog);
  if (!sheet || registeredSheets.has(sheet)) return;
  registeredSheets.add(sheet);
  if (!sheet.id) sheet.id = `store-pilot-dialog-${Math.random().toString(16).slice(2)}`;
  if (!dialog.hasAttribute("tabindex")) dialog.setAttribute("tabindex", "-1");
  const observer = new MutationObserver(() => syncSheet(sheet));
  observer.observe(sheet, { attributes: true, attributeFilter: ["aria-hidden", "class"] });
  sheetObservers.set(sheet, observer);
  syncSheet(sheet);
}

function registerDialogs(root = document) {
  if (root instanceof Element && root.matches("[role='dialog'][aria-modal='true']")) registerDialog(root);
  root.querySelectorAll?.("[role='dialog'][aria-modal='true']").forEach(registerDialog);
}

function requestClose(sheet) {
  if (!sheet) return;
  const close = sheet.querySelector(CLOSE_SELECTOR);
  if (close instanceof HTMLElement) {
    close.click();
    return;
  }
  sheet.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
}

function handleKeydown(event) {
  const sheet = activeSheet && isSheetOpen(activeSheet) ? activeSheet : openSheets().at(-1);
  if (!sheet) return;
  const dialog = sheet.querySelector("[role='dialog'][aria-modal='true']");
  if (!dialog) return;

  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    requestClose(sheet);
    return;
  }

  if (event.key !== "Tab") return;
  const focusable = focusableElements(dialog);
  if (!focusable.length) {
    event.preventDefault();
    dialog.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function handleFocusIn(event) {
  const sheet = activeSheet;
  if (!sheet || !isSheetOpen(sheet) || sheet.contains(event.target)) return;
  focusDialog(sheet);
}

function handlePopState() {
  if (suppressNextPop) {
    suppressNextPop = false;
    return;
  }
  const sheet = activeSheet && isSheetOpen(activeSheet) ? activeSheet : openSheets().at(-1);
  if (!sheet) return;
  closingFromHistory = true;
  requestClose(sheet);
  queueMicrotask(() => { closingFromHistory = false; });
}

function startAccessibilityController() {
  registerDialogs();
  bodyObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
      if (node instanceof Element) registerDialogs(node);
    }));
  });
  bodyObserver.observe(document.body, { childList: true });
  document.addEventListener("keydown", handleKeydown, true);
  document.addEventListener("focusin", handleFocusIn, true);
  window.addEventListener("popstate", handlePopState);
  document.documentElement.dataset.accessibilityOwner = ACCESSIBILITY_RELEASE;
}

window.StorePilotAccessibility = {
  version: ACCESSIBILITY_RELEASE,
  activeDialog: () => activeSheet,
  refresh: registerDialogs
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startAccessibilityController, { once: true });
else startAccessibilityController();
