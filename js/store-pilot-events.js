import { STORE_PILOT_EVENT_NAMES, eventsForStorageKey } from "./store-pilot-event-map.js?v=command-center-28";

const EVENTS_RELEASE = "command-center-28";
const SCREEN_TITLES = {
  next: "next",
  tasks: "tasks",
  report: "report",
  incident: "report",
  log: "log",
  notes: "voice",
  voice: "voice",
  templates: "templates",
  settings: "templates"
};

let screenObserver = null;
let screenUpdateQueued = false;
let lastScreen = "";

function emit(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function emitStorageChange({ key, oldValue, newValue, source }) {
  const detail = { key, oldValue, newValue, source, changedAt: new Date().toISOString() };
  eventsForStorageKey(key).forEach((name) => emit(name, detail));
}

function installStorageBridge() {
  if (window.__storePilotStorageBridgeInstalled) return;

  let storage;
  try { storage = window.localStorage; }
  catch { return; }

  const prototype = window.Storage?.prototype;
  if (!prototype) return;

  const native = {
    setItem: prototype.setItem,
    removeItem: prototype.removeItem,
    clear: prototype.clear
  };

  prototype.setItem = function setStorePilotItem(key, value) {
    const isLocal = this === storage;
    const normalizedKey = String(key);
    const oldValue = isLocal ? this.getItem(normalizedKey) : null;
    native.setItem.call(this, normalizedKey, String(value));
    if (!isLocal) return;
    const newValue = this.getItem(normalizedKey);
    if (oldValue !== newValue) emitStorageChange({ key: normalizedKey, oldValue, newValue, source: "same-window" });
  };

  prototype.removeItem = function removeStorePilotItem(key) {
    const isLocal = this === storage;
    const normalizedKey = String(key);
    const oldValue = isLocal ? this.getItem(normalizedKey) : null;
    native.removeItem.call(this, normalizedKey);
    if (isLocal && oldValue !== null) emitStorageChange({ key: normalizedKey, oldValue, newValue: null, source: "same-window" });
  };

  prototype.clear = function clearStorePilotItems() {
    const isLocal = this === storage;
    const hadItems = isLocal && this.length > 0;
    native.clear.call(this);
    if (hadItems) emitStorageChange({ key: null, oldValue: null, newValue: null, source: "same-window" });
  };

  window.__storePilotStorageBridgeInstalled = true;
  window.__storePilotStorageNative = native;
}

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  return value;
}

function remove(key) {
  localStorage.removeItem(key);
}

function update(key, fallback, updater) {
  const current = read(key, fallback);
  const next = updater(current);
  write(key, next);
  return next;
}

function on(name, listener, options) {
  window.addEventListener(name, listener, options);
  return () => window.removeEventListener(name, listener, options);
}

function currentScreen() {
  const active = document.querySelector(".nav-button.active[data-screen]")?.dataset.screen;
  if (active) return active;
  const title = document.querySelector("#screen-title")?.textContent?.trim().toLowerCase() || "next";
  return SCREEN_TITLES[title] || "next";
}

function queueScreenChange(source = "ui", force = false) {
  if (screenUpdateQueued && !force) return;
  screenUpdateQueued = true;
  requestAnimationFrame(() => {
    screenUpdateQueued = false;
    const screen = currentScreen();
    if (!force && screen === lastScreen) return;
    lastScreen = screen;
    emit(STORE_PILOT_EVENT_NAMES.screen, { screen, source });
  });
}

function installScreenBridge() {
  if (screenObserver) return;
  const title = document.querySelector("#screen-title");
  const buttons = [...document.querySelectorAll(".nav-button[data-screen]")];
  if (!title && !buttons.length) return;

  screenObserver = new MutationObserver(() => queueScreenChange("dom"));
  buttons.forEach((button) => screenObserver.observe(button, { attributes: true, attributeFilter: ["class"] }));
  if (title) screenObserver.observe(title, { childList: true, characterData: true, subtree: true });
}

function announceReady() {
  installScreenBridge();
  queueScreenChange("ready", true);
  emit(STORE_PILOT_EVENT_NAMES.ready, { version: EVENTS_RELEASE, screen: currentScreen() });
}

installStorageBridge();
window.addEventListener("storage", (event) => {
  emitStorageChange({ key: event.key, oldValue: event.oldValue, newValue: event.newValue, source: "cross-window" });
});

window.StorePilotEvents = Object.freeze({
  version: EVENTS_RELEASE,
  names: STORE_PILOT_EVENT_NAMES,
  read,
  write,
  remove,
  update,
  emit,
  on,
  screen: currentScreen,
  refreshScreen: () => queueScreenChange("manual", true)
});

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", announceReady, { once: true });
else announceReady();
