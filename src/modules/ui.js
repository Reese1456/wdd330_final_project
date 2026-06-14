// Shared UI utilities: toasts, XP bar, spinners, level-up overlay, badge pops.

const TOAST_DURATION = 3200;
const LEVEL_UP_DURATION = 2500;
const BADGE_POP_DURATION = 3600;

export function toast(message) {
  const stack = document.getElementById("toast-stack");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => el.remove(), TOAST_DURATION);
}

export function setXPBar(percent) {
  const bar = document.getElementById("xp-bar");
  const fill = document.getElementById("xp-bar-fill");
  const clamped = Math.max(0, Math.min(100, percent));
  fill.style.width = `${clamped}%`;
  bar.setAttribute("aria-valuenow", String(clamped));
}

export function showSpinner(id, visible) {
  document.getElementById(id)?.classList.toggle("is-hidden", !visible);
}

// Full-screen celebration when the player crosses a level threshold.
// Markup is injected on demand — no static HTML needed in index.html.
export function showLevelUp(level, title) {
  const overlay = document.createElement("div");
  overlay.className = "levelup-overlay";
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "assertive");
  overlay.innerHTML = `
    <div class="levelup-card">
      <p class="levelup-kicker">Level Up</p>
      <p class="levelup-num mono">${level}</p>
      <p class="levelup-title">${title}</p>
    </div>
  `;
  document.body.appendChild(overlay);
  // Force a reflow so the transition runs from the un-activated state
  requestAnimationFrame(() => overlay.classList.add("is-active"));

  setTimeout(() => {
    overlay.classList.remove("is-active");
    setTimeout(() => overlay.remove(), 300);
  }, LEVEL_UP_DURATION);
}

// A celebratory pop for a newly unlocked badge — richer than a plain toast.
export function showBadgeUnlock(badge) {
  const stack = document.getElementById("toast-stack");
  const el = document.createElement("div");
  el.className = "badge-pop";
  el.setAttribute("role", "status");
  el.innerHTML = `
    <span class="badge-pop-icon" aria-hidden="true">${badge.icon}</span>
    <span class="badge-pop-text">
      <span class="badge-pop-kicker">Badge Unlocked</span>
      <span class="badge-pop-name">${badge.name}</span>
    </span>
  `;
  stack.appendChild(el);
  setTimeout(() => el.remove(), BADGE_POP_DURATION);
}
