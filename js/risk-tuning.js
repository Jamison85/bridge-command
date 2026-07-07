function taskText(task) {
  return `${task?.title || ""} ${task?.area || ""} ${task?.detail || ""}`.toLowerCase();
}

function hasTrueRedRisk(data) {
  if (!data) return false;
  const trueUrgent = data.open?.some((task) => /outage|register|system|incident|wet|water|lock/i.test(taskText(task)));
  return Boolean(trueUrgent || data.delayed?.length >= 3 || data.carried?.length >= 3);
}

function tuneAnalysis() {
  const engine = window.StorePilotContextEngine;
  if (!engine?.analyze || engine.__riskTuned) return;
  const originalAnalyze = engine.analyze;
  engine.analyze = function tunedAnalyze() {
    const analysis = originalAnalyze();
    if (analysis?.risk === "red" && !hasTrueRedRisk(analysis.data)) {
      analysis.risk = "yellow";
    }
    return analysis;
  };
  engine.__riskTuned = true;
}

function tuneRiskPills() {
  tuneAnalysis();
  const analysis = window.StorePilotContextEngine?.analyze?.();
  if (!analysis) return;
  const shouldDowngrade = analysis.risk !== "red";
  if (!shouldDowngrade) return;

  document.querySelectorAll("#context-engine-card, #command-detail-card").forEach((card) => {
    if (card?.dataset?.risk === "red") card.dataset.risk = "yellow";
  });

  document.querySelectorAll(".context-risk-pill").forEach((pill) => {
    if (/red priority/i.test(pill.textContent || "")) pill.textContent = "Watch";
  });

  document.querySelectorAll(".command-risk-pill").forEach((pill) => {
    if (/needs attention/i.test(pill.textContent || "")) pill.textContent = "Watch";
  });
}

document.addEventListener("click", () => setTimeout(tuneRiskPills, 220));
document.addEventListener("change", () => setTimeout(tuneRiskPills, 220));
setInterval(tuneRiskPills, 700);
setTimeout(tuneRiskPills, 350);
