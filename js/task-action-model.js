export function normalizeTaskTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function objectMap(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function uniqueTaskIds(taskIds) {
  return [...new Set((Array.isArray(taskIds) ? taskIds : [taskIds])
    .map((value) => String(value || "").trim())
    .filter(Boolean))];
}

export function completeTaskRecords(completedInput, statesInput, shiftKey, taskIds) {
  const completedStore = { ...objectMap(completedInput) };
  const stateStore = { ...objectMap(statesInput) };
  const ids = uniqueTaskIds(taskIds);
  const completed = new Set(Array.isArray(completedStore[shiftKey]) ? completedStore[shiftKey] : []);
  const states = { ...objectMap(stateStore[shiftKey]) };

  ids.forEach((taskId) => {
    completed.add(taskId);
    delete states[taskId];
  });

  completedStore[shiftKey] = [...completed];
  stateStore[shiftKey] = states;
  return { completedStore, stateStore, completedIds: [...completed], changedTaskIds: ids };
}

export function reopenTaskRecords(completedInput, statesInput, shiftKey, taskIds) {
  const completedStore = { ...objectMap(completedInput) };
  const stateStore = { ...objectMap(statesInput) };
  const ids = new Set(uniqueTaskIds(taskIds));
  const completed = (Array.isArray(completedStore[shiftKey]) ? completedStore[shiftKey] : [])
    .filter((taskId) => !ids.has(String(taskId || "")));
  const states = { ...objectMap(stateStore[shiftKey]) };

  ids.forEach((taskId) => delete states[taskId]);
  completedStore[shiftKey] = completed;
  stateStore[shiftKey] = states;
  return { completedStore, stateStore, completedIds: completed, changedTaskIds: [...ids] };
}

export function setTaskStateRecord(statesInput, shiftKey, taskId, state) {
  const stateStore = { ...objectMap(statesInput) };
  const shiftStates = { ...objectMap(stateStore[shiftKey]) };
  const id = String(taskId || "").trim();
  if (!id) return stateStore;

  shiftStates[id] = { ...objectMap(state), updatedAt: state?.updatedAt || new Date().toISOString() };
  stateStore[shiftKey] = shiftStates;
  return stateStore;
}

export function clearChecklistRecord(checklistsInput, shiftKey, taskId) {
  const checklistStore = { ...objectMap(checklistsInput) };
  const shiftChecklists = { ...objectMap(checklistStore[shiftKey]) };
  delete shiftChecklists[String(taskId || "")];
  checklistStore[shiftKey] = shiftChecklists;
  return checklistStore;
}

export function removeTaskArtifacts(records, shiftKey, taskId) {
  const reopened = reopenTaskRecords(records.completed, records.states, shiftKey, taskId);
  return {
    completed: reopened.completedStore,
    states: reopened.stateStore,
    checklists: clearChecklistRecord(records.checklists, shiftKey, taskId)
  };
}

export function appendCustomTask(customInput, shiftKey, task) {
  const customStore = { ...objectMap(customInput) };
  const current = Array.isArray(customStore[shiftKey]) ? [...customStore[shiftKey]] : [];
  current.push({ ...task });
  customStore[shiftKey] = current;
  return customStore;
}
