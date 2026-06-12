// Workout logging: exercise search, session queue, finish-workout XP award.
// Weights are entered in the player's chosen units but stored in kg.

import { KG_PER_LB } from "./player.js";
import { toast } from "./ui.js";

const SEARCH_DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;
const XP_DIVISOR = 10;
const MIN_SESSION_XP = 50;

export default function initWorkoutLog({ player, api, onProfileChange }) {
  const searchInput = document.getElementById("exercise-search");
  const resultsBox = document.getElementById("search-results");
  const setForm = document.getElementById("set-form");
  const selectedName = document.getElementById("selected-exercise-name");
  const queueList = document.getElementById("session-queue");
  const queueEmpty = document.getElementById("queue-empty");
  const volumeEl = document.getElementById("session-volume");
  const finishBtn = document.getElementById("finish-workout");

  let selectedExercise = null;
  let queue = []; // { name, target, sets, reps, weightKg }
  let debounceTimer = null;

  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const query = searchInput.value.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      resultsBox.innerHTML = "";
      return;
    }
    debounceTimer = setTimeout(() => runSearch(query), SEARCH_DEBOUNCE_MS);
  });

  async function runSearch(query) {
    resultsBox.innerHTML = `<p class="search-empty">Searching…</p>`;
    try {
      const results = await api.searchByName(query);
      renderResults(results.slice(0, 8));
    } catch (err) {
      console.error(err);
      resultsBox.innerHTML = `<p class="search-empty">Search failed — check your connection and try again.</p>`;
    }
  }

  function renderResults(results) {
    if (results.length === 0) {
      resultsBox.innerHTML = `<p class="search-empty">No exercises found.</p>`;
      return;
    }
    resultsBox.innerHTML = "";
    for (const ex of results) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "search-result";
      btn.setAttribute("role", "option");
      btn.innerHTML = `
        <span class="queue-item-name">${ex.name}</span>
        <span class="muscle-tag">${ex.target}</span>
      `;
      btn.addEventListener("click", () => selectExercise(ex));
      resultsBox.appendChild(btn);
    }
  }

  function selectExercise(exercise) {
    selectedExercise = exercise;
    selectedName.textContent = exercise.name;
    setForm.classList.remove("is-hidden");
    resultsBox.innerHTML = "";
    searchInput.value = exercise.name;
    document.getElementById("input-sets").focus();
  }

  // The exercise library dispatches this when a card is tapped
  document.addEventListener("liftlore:select-exercise", (event) => {
    selectExercise(event.detail);
  });

  setForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!selectedExercise) return;

    const sets = Number(document.getElementById("input-sets").value);
    const reps = Number(document.getElementById("input-reps").value);
    const weight = Number(document.getElementById("input-weight").value);
    const weightKg = player.units === "lbs" ? weight * KG_PER_LB : weight;

    queue.push({
      name: selectedExercise.name,
      target: selectedExercise.target,
      sets,
      reps,
      weightKg,
    });

    selectedExercise = null;
    setForm.classList.add("is-hidden");
    searchInput.value = "";
    renderQueue();
  });

  queueList.addEventListener("click", (event) => {
    const removeBtn = event.target.closest(".queue-remove");
    if (!removeBtn) return;
    queue.splice(Number(removeBtn.dataset.index), 1);
    renderQueue();
  });

  function displayWeight(weightKg) {
    return player.units === "lbs"
      ? Math.round(weightKg / KG_PER_LB)
      : Math.round(weightKg * 10) / 10;
  }

  function sessionVolumeKg() {
    return queue.reduce((sum, item) => sum + item.sets * item.reps * item.weightKg, 0);
  }

  function renderQueue() {
    queueList.querySelectorAll(".queue-item").forEach((el) => el.remove());
    queueEmpty.classList.toggle("is-hidden", queue.length > 0);

    queue.forEach((item, index) => {
      const li = document.createElement("li");
      li.className = "queue-item";
      li.innerHTML = `
        <div>
          <div class="queue-item-name">${item.name}</div>
          <div class="queue-item-detail">${item.sets} × ${item.reps} @ ${displayWeight(item.weightKg)} ${player.units}</div>
        </div>
        <button class="queue-remove" data-index="${index}" aria-label="Remove ${item.name} from session">✕</button>
      `;
      queueList.appendChild(li);
    });

    const volumeKg = sessionVolumeKg();
    const shown = player.units === "lbs" ? Math.round(volumeKg / KG_PER_LB) : Math.round(volumeKg);
    volumeEl.textContent = shown.toLocaleString();
    finishBtn.disabled = queue.length === 0;
  }

  finishBtn.addEventListener("click", () => {
    const volumeKg = sessionVolumeKg();
    const maxSetWeightKg = Math.max(...queue.map((item) => item.weightKg));
    const xpEarned = Math.max(MIN_SESSION_XP, Math.round(volumeKg / XP_DIVISOR));

    const newBadges = player.recordWorkout({ volumeKg, maxSetWeightKg });
    const { leveledUp, level } = player.addXP(xpEarned);
    // Level may have crossed a badge threshold (Legend)
    newBadges.push(...player.evaluateBadges());

    queue = [];
    renderQueue();

    toast(`Workout complete! +${xpEarned} XP`);
    if (leveledUp) toast(`⬆ Level up! You are now Level ${level} — ${player.title}`);
    for (const badge of newBadges) toast(`${badge.icon} Badge unlocked: ${badge.name}`);

    onProfileChange();
  });

  // Re-render the queue when units change so displayed weights update
  return { refreshUnits: renderQueue };
}
