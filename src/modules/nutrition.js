// Nutrition tracker: natural-language food search, a per-day food log persisted
// to localStorage, and a running macro summary. Unlocks the Macro Master badge
// once a full day (4+ entries) is logged.

import { toast, showBadgeUnlock } from "./ui.js";

const STORAGE_KEY = "liftlore_food_log";
const SEARCH_DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;
const FULL_DAY_ENTRIES = 4;

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export default function initNutrition({ player, api, onProfileChange }) {
  const searchInput = document.getElementById("food-search");
  const resultsBox = document.getElementById("food-results");
  const logList = document.getElementById("food-log");
  const logEmpty = document.getElementById("food-log-empty");
  const macroEls = {
    calories: document.getElementById("macro-calories"),
    protein: document.getElementById("macro-protein"),
    carbs: document.getElementById("macro-carbs"),
    fat: document.getElementById("macro-fat"),
  };

  let entries = loadEntries();
  let debounceTimer = null;

  // The stored log carries its own date so it resets at midnight on load.
  function loadEntries() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (stored && stored.date === todayString()) return stored.items;
    } catch {
      // Corrupt data — start fresh rather than crash
    }
    return [];
  }

  function saveEntries() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ date: todayString(), items: entries })
    );
  }

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
      const foods = await api.search(query);
      renderResults(foods);
    } catch (err) {
      console.error(err);
      resultsBox.innerHTML = `<p class="search-empty">Search failed — check your connection and try again.</p>`;
    }
  }

  function renderResults(foods) {
    if (foods.length === 0) {
      resultsBox.innerHTML = `<p class="search-empty">No foods found.</p>`;
      return;
    }
    resultsBox.innerHTML = "";
    for (const food of foods) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "search-result";
      btn.innerHTML = `
        <span class="queue-item-name">${food.name}</span>
        <span class="muscle-tag">${food.calories} kcal</span>
      `;
      btn.addEventListener("click", () => addEntry(food));
      resultsBox.appendChild(btn);
    }
  }

  function addEntry(food) {
    entries.push(food);
    saveEntries();
    searchInput.value = "";
    resultsBox.innerHTML = "";
    render();
    checkMacroMaster();
  }

  function removeEntry(index) {
    entries.splice(index, 1);
    saveEntries();
    render();
  }

  logList.addEventListener("click", (event) => {
    const removeBtn = event.target.closest(".food-remove");
    if (!removeBtn) return;
    removeEntry(Number(removeBtn.dataset.index));
  });

  function render() {
    logList.querySelectorAll(".food-item").forEach((el) => el.remove());
    logEmpty.classList.toggle("is-hidden", entries.length > 0);

    entries.forEach((food, index) => {
      const li = document.createElement("li");
      li.className = "food-item";
      li.innerHTML = `
        <div>
          <div class="queue-item-name">${food.name}</div>
          <div class="queue-item-detail">${food.calories} kcal · P ${food.protein} · C ${food.carbs} · F ${food.fat}</div>
        </div>
        <button class="food-remove queue-remove" data-index="${index}" aria-label="Remove ${food.name} from log">✕</button>
      `;
      logList.appendChild(li);
    });

    renderMacros();
  }

  function renderMacros() {
    const totals = entries.reduce(
      (sum, food) => ({
        calories: sum.calories + food.calories,
        protein: sum.protein + food.protein,
        carbs: sum.carbs + food.carbs,
        fat: sum.fat + food.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
    macroEls.calories.textContent = totals.calories.toLocaleString();
    macroEls.protein.textContent = `${totals.protein}g`;
    macroEls.carbs.textContent = `${totals.carbs}g`;
    macroEls.fat.textContent = `${totals.fat}g`;
  }

  function checkMacroMaster() {
    if (entries.length < FULL_DAY_ENTRIES) return;
    const newBadges = player.evaluateBadges({ fullDayNutrition: true });
    if (newBadges.length === 0) return;
    for (const badge of newBadges) showBadgeUnlock(badge);
    onProfileChange();
  }

  render();
}
