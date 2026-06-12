// Shared UI utilities: toasts, XP bar, spinners.
// The level-up overlay and badge pop animation land in Week 6.

const TOAST_DURATION = 3200;

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
