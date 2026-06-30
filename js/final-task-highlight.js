function currentScreenName() {
  const active = document.querySelector(".nav-button.active");
  return active?.dataset.screen || "next";
}

function highlightNextTask() {
  document.querySelectorAll(".task-row.next-up").forEach((row) => row.classList.remove("next-up"));
  document.querySelectorAll(".next-up-chip").forEach((chip) => chip.remove());

  const screen = currentScreenName();
  if (screen !== "next" && screen !== "tasks") return;

  const rows = [...document.querySelectorAll("#screen-content .task-row")];
  const row = rows.find((item) => !item.classList.contains("done") && !item.classList.contains("delayed") && !item.classList.contains("carry"));
  if (!row) return;

  row.classList.add("next-up");
  const meta = row.querySelector(".task-meta");
  if (!meta) return;
  const chip = document.createElement("span");
  chip.className = "next-up-chip";
  chip.textContent = screen === "next" ? "Current focus" : "Next up";
  meta.insertAdjacentElement("afterend", chip);
}

document.addEventListener("click", () => setTimeout(highlightNextTask, 80));
document.addEventListener("change", () => setTimeout(highlightNextTask, 80));
setInterval(highlightNextTask, 1000);
setTimeout(highlightNextTask, 250);
