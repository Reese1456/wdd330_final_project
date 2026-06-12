// LiftLore entry point — wires modules together and owns view switching.

import Player, { BADGES } from "./src/modules/player.js";
import ExerciseDB from "./src/api/exerciseDB.js";
import initWorkoutLog from "./src/modules/workoutLog.js";
import initExerciseLibrary from "./src/modules/exerciseLibrary.js";
import { setXPBar } from "./src/modules/ui.js";

// config.js is gitignored, so it may not exist on a fresh clone or on the
// deployed site — fall back to mock mode rather than failing to load.
let exerciseDbKey = "";
try {
  const config = await import("./config.js");
  exerciseDbKey = config.EXERCISEDB_KEY ?? "";
} catch {
  console.info("No config.js found — running with mock exercise data.");
}

const player = new Player();
const exerciseApi = new ExerciseDB(exerciseDbKey);

/* ---------- View switching ---------- */
const views = document.querySelectorAll(".view");
const navButtons = document.querySelectorAll(".nav-btn");

function showView(name) {
  views.forEach((v) => v.classList.toggle("is-active", v.id === `view-${name}`));
  navButtons.forEach((b) => b.classList.toggle("is-active", b.dataset.view === name));
  window.scrollTo({ top: 0 });
}

navButtons.forEach((btn) =>
  btn.addEventListener("click", () => showView(btn.dataset.view))
);

document.querySelectorAll("[data-view-link]").forEach((el) =>
  el.addEventListener("click", (event) => {
    event.preventDefault();
    showView(el.dataset.viewLink);
  })
);

/* ---------- Dashboard rendering ---------- */
function refreshDashboard() {
  document.getElementById("header-level").textContent = `LV ${player.level}`;
  document.getElementById("player-level").textContent = player.level;
  document.getElementById("player-title").textContent = player.title;
  document.getElementById("player-xp").textContent = player.xp.toLocaleString();

  const { percent, remaining } = player.xpProgress;
  document.getElementById("xp-to-next").textContent =
    remaining > 0 ? `${remaining.toLocaleString()} to next level` : "Max level reached";
  setXPBar(percent);

  document.getElementById("stat-workouts").textContent = player.state.totalWorkouts;
  document.getElementById("stat-streak").textContent = player.state.streak;
  document.getElementById("stat-badges").textContent =
    `${player.state.badges.length}/${BADGES.length}`;

  renderBadgeShelf();
}

function renderBadgeShelf() {
  const shelf = document.getElementById("badge-shelf");
  shelf.innerHTML = "";
  for (const badge of BADGES) {
    const unlocked = player.hasBadge(badge.id);
    const li = document.createElement("li");
    li.className = `badge-tile ${unlocked ? "" : "is-locked"}`;
    li.title = badge.desc;
    li.innerHTML = `
      <span class="badge-icon" aria-hidden="true">${badge.icon}</span>
      <span class="badge-name">${badge.name}</span>
    `;
    shelf.appendChild(li);
  }
}

/* ---------- Unit toggle ---------- */
const unitButtons = document.querySelectorAll(".unit-btn");

function applyUnits() {
  unitButtons.forEach((b) =>
    b.classList.toggle("is-active", b.dataset.unit === player.units)
  );
  document.querySelectorAll(".unit-label").forEach((el) => {
    el.textContent = player.units;
  });
}

unitButtons.forEach((btn) =>
  btn.addEventListener("click", () => {
    player.setUnits(btn.dataset.unit);
    applyUnits();
    workoutLog.refreshUnits();
  })
);

/* ---------- Module init ---------- */
const workoutLog = initWorkoutLog({
  player,
  api: exerciseApi,
  onProfileChange: refreshDashboard,
});

initExerciseLibrary({
  api: exerciseApi,
  onExerciseSelected: () => showView("log"),
});

applyUnits();
refreshDashboard();
