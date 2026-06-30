function moveFollowupsOutOfTaskList() {
  const screenTitle = document.querySelector("#screen-title")?.textContent || "";
  const isTasksScreen = screenTitle.toLowerCase().includes("tasks");
  if (!isTasksScreen) return;
  if (document.querySelector(".followup-bucket")) return;

  const taskRows = [...document.querySelectorAll(".task-row.delayed, .task-row.carry")];
  if (!taskRows.length) return;

  const bucket = document.createElement("section");
  bucket.className = "followup-bucket";
  bucket.innerHTML = `<div class="followup-bucket-header"><strong>Follow-ups documented</strong><span>${taskRows.length}</span></div><p>These are no longer active tasks for this shift. They will still show in the end-of-day review.</p>`;

  const list = document.createElement("div");
  list.className = "followup-bucket-list";
  taskRows.forEach((row) => {
    row.classList.add("moved-followup");
    list.appendChild(row);
  });

  bucket.appendChild(list);
  document.querySelector("#screen-content")?.appendChild(bucket);
}

document.addEventListener("click", () => setTimeout(moveFollowupsOutOfTaskList, 35));
document.addEventListener("change", () => setTimeout(moveFollowupsOutOfTaskList, 35));
window.addEventListener("storage", moveFollowupsOutOfTaskList);
setTimeout(moveFollowupsOutOfTaskList, 120);
