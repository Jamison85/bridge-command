function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function mergeLogTasks(templateTasks, customTasks) {
  const merged = new Map();
  [...asArray(templateTasks), ...asArray(customTasks)].forEach((task) => {
    if (!task || typeof task !== "object" || !task.id) return;
    merged.set(String(task.id), { ...task, id: String(task.id) });
  });
  return [...merged.values()];
}

export function buildLogState({
  shift = "morning",
  dateKey = "",
  templates = {},
  customTasks = {},
  completed = {},
  taskStates = {}
} = {}) {
  const safeTemplates = asObject(templates);
  const safeCustom = asObject(customTasks);
  const safeCompleted = asObject(completed);
  const safeStates = asObject(taskStates);
  const shiftKey = `${dateKey}:${shift}`;
  const tasks = mergeLogTasks(safeTemplates[shift], safeCustom[shiftKey]);
  const completedIds = new Set(asArray(safeCompleted[shiftKey]).map(String));
  const states = asObject(safeStates[shiftKey]);

  const done = [];
  const delayed = [];
  const carried = [];
  const open = [];

  tasks.forEach((task) => {
    if (completedIds.has(task.id)) {
      done.push(task);
      return;
    }
    const type = states[task.id]?.type;
    if (type === "delayed") delayed.push(task);
    else if (type === "carry") carried.push(task);
    else open.push(task);
  });

  const documented = delayed.length + carried.length;
  const followups = documented + open.length;
  const completion = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;

  return {
    shift,
    dateKey,
    shiftKey,
    tasks,
    states,
    done,
    completed: done,
    delayed,
    carried,
    open,
    active: open,
    counts: {
      total: tasks.length,
      done: done.length,
      delayed: delayed.length,
      carried: carried.length,
      documented,
      open: open.length,
      followups
    },
    completion
  };
}

export function isUrgentLogTask(task, state = {}) {
  const text = `${task?.title || ""} ${task?.area || ""} ${task?.detail || ""} ${state?.reason || ""}`.toLowerCase();
  return /safety|unsafe|injury|accident|spill|wet floor|power outage|outage|system down|register down|pos down|food safety|temperature|spoiled|cooler down|freezer down|staffing crisis|short staffed|call out|alone|incident report|customer incident|security|police|medical/.test(text);
}

export function logRiskStatus(state) {
  const followups = [...asArray(state?.delayed), ...asArray(state?.carried), ...asArray(state?.open)];
  if (followups.some((task) => isUrgentLogTask(task, state?.states?.[task.id]))) return "red";
  if (followups.length) return "yellow";
  return "green";
}

export function logStatusSummary(state) {
  const counts = state?.counts || {};
  return `${counts.done || 0} done • ${counts.documented || 0} documented • ${counts.open || 0} still open`;
}
