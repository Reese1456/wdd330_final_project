// Exercise library: browse by muscle group, tap a card to start logging it.

import { showSpinner } from "./ui.js";

export default function initExerciseLibrary({ api, onExerciseSelected }) {
  const filterBar = document.getElementById("muscle-filters");
  const grid = document.getElementById("exercise-grid");

  filterBar.addEventListener("click", (event) => {
    const btn = event.target.closest(".filter-btn");
    if (!btn) return;
    filterBar.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    loadGroup(btn.dataset.muscle);
  });

  async function loadGroup(group) {
    grid.innerHTML = "";
    showSpinner("library-spinner", true);
    try {
      const exercises = await api.getByMuscle(group);
      renderGrid(exercises);
    } catch (err) {
      console.error(err);
      grid.innerHTML = `<li class="search-empty">Couldn't load exercises — try again in a moment.</li>`;
    } finally {
      showSpinner("library-spinner", false);
    }
  }

  function renderGrid(exercises) {
    grid.innerHTML = "";
    if (exercises.length === 0) {
      grid.innerHTML = `<li class="search-empty">No exercises in this group.</li>`;
      return;
    }
    for (const ex of exercises) {
      const li = document.createElement("li");
      li.className = "exercise-card";
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      li.setAttribute("aria-label", `Log ${ex.name}`);
      li.innerHTML = `
        <h3 class="exercise-card-name">${ex.name}</h3>
        <div class="exercise-card-meta">
          <span class="muscle-tag">${ex.target}</span>
          <span class="equipment-tag">${ex.equipment}</span>
        </div>
      `;
      const select = () => {
        document.dispatchEvent(new CustomEvent("liftlore:select-exercise", { detail: ex }));
        onExerciseSelected();
      };
      li.addEventListener("click", select);
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select();
        }
      });
      grid.appendChild(li);
    }
  }

  loadGroup("all");
}
