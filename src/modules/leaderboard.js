// Leaderboard: merges the live player into a hardcoded roster of seeded
// athletes, sorts by XP, and renders a ranked list. No API — purely local.

const MEDALS = ["🥇", "🥈", "🥉"];

// Seeded competitors so the board feels populated from day one.
const SEEDED_ATHLETES = [
  { name: "Ava Strongarm", level: 9, xp: 19400, totalWorkouts: 84 },
  { name: "Marcus Steele", level: 7, xp: 11200, totalWorkouts: 57 },
  { name: "Lena Powers", level: 6, xp: 8300, totalWorkouts: 41 },
  { name: "Diego Vega", level: 5, xp: 5600, totalWorkouts: 33 },
  { name: "Nina Kettler", level: 4, xp: 3400, totalWorkouts: 22 },
  { name: "Sam Reps", level: 3, xp: 1800, totalWorkouts: 14 },
  { name: "Tariq Bench", level: 2, xp: 700, totalWorkouts: 6 },
];

export default function initLeaderboard({ player }) {
  const list = document.getElementById("leaderboard-list");

  // Re-render on every call so the player's row reflects fresh XP.
  return function render() {
    const you = {
      name: "You",
      level: player.level,
      xp: player.xp,
      totalWorkouts: player.state.totalWorkouts,
      isYou: true,
    };

    const ranked = [...SEEDED_ATHLETES, you].sort((a, b) => b.xp - a.xp);

    list.innerHTML = "";
    ranked.forEach((athlete, index) => {
      const rank = index + 1;
      const isMedal = rank <= MEDALS.length;
      const li = document.createElement("li");
      li.className = `leaderboard-row${athlete.isYou ? " is-you" : ""}${isMedal ? " is-medal" : ""}`;
      li.innerHTML = `
        <span class="lb-rank" aria-label="Rank ${rank}">${isMedal ? MEDALS[index] : rank}</span>
        <span class="lb-avatar" aria-hidden="true">${athlete.name.charAt(0)}</span>
        <span class="lb-identity">
          <span class="lb-name">${athlete.name}</span>
          <span class="lb-meta">LV ${athlete.level} · ${athlete.totalWorkouts} workouts</span>
        </span>
        <span class="lb-xp">${athlete.xp.toLocaleString()} XP</span>
      `;
      list.appendChild(li);
    });
  };
}
