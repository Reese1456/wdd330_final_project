// Player state: XP, levelling, streak, badges, settings. Single source of
// truth, persisted to localStorage under "liftlore_player".

const STORAGE_KEY = "liftlore_player";
const MAX_LEVEL = 10;

const LEVEL_TITLES = [
  "Rookie", "Novice", "Athlete", "Competitor", "Contender",
  "Fighter", "Warrior", "Champion", "Elite", "Legend",
];

export const KG_PER_LB = 0.45359237;

export const BADGES = [
  { id: "first-blood", name: "First Blood", icon: "🩸", desc: "Complete your first workout" },
  { id: "streak-3", name: "3-Day Streak", icon: "🔥", desc: "Work out 3 days in a row" },
  { id: "week-warrior", name: "Week Warrior", icon: "🗡️", desc: "Work out 7 days in a row" },
  { id: "iron-will", name: "Iron Will", icon: "🛡️", desc: "Complete 10 workouts" },
  { id: "century-club", name: "Century Club", icon: "💯", desc: "Lift 100 kg total in one session" },
  { id: "macro-master", name: "Macro Master", icon: "🥗", desc: "Log a full day of nutrition" },
  { id: "cardio-king", name: "Cardio King", icon: "👟", desc: "Log a cardio-only session" },
  { id: "heavy-lifter", name: "Heavy Lifter", icon: "🏋️", desc: "Log a set of 100 kg or more" },
  { id: "legend", name: "Legend", icon: "👑", desc: "Reach Level 10" },
];

const DEFAULT_STATE = {
  xp: 0,
  totalWorkouts: 0,
  streak: 0,
  lastWorkoutDate: null, // "YYYY-MM-DD"
  badges: [], // unlocked badge ids
  settings: { units: "kg" },
};

// Cumulative XP required to *reach* level n. Thresholds grow 500 XP per
// level (L1→L2: 500, L2→L3: 1000, ...), so reaching level n costs 250·n·(n−1).
function xpToReachLevel(n) {
  return 250 * n * (n - 1);
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export default class Player {
  constructor() {
    let stored = {};
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
    } catch {
      // Corrupt data — start fresh rather than crash
    }
    this.state = {
      ...structuredClone(DEFAULT_STATE),
      ...stored,
      settings: { ...DEFAULT_STATE.settings, ...stored.settings },
    };
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  get xp() {
    return this.state.xp;
  }

  get level() {
    let level = 1;
    while (level < MAX_LEVEL && this.state.xp >= xpToReachLevel(level + 1)) {
      level += 1;
    }
    return level;
  }

  get title() {
    return LEVEL_TITLES[this.level - 1];
  }

  /** Progress through the current level: { percent, remaining } */
  get xpProgress() {
    const level = this.level;
    if (level === MAX_LEVEL) return { percent: 100, remaining: 0 };
    const floor = xpToReachLevel(level);
    const ceiling = xpToReachLevel(level + 1);
    return {
      percent: Math.round(((this.state.xp - floor) / (ceiling - floor)) * 100),
      remaining: ceiling - this.state.xp,
    };
  }

  get units() {
    return this.state.settings.units;
  }

  setUnits(units) {
    this.state.settings.units = units;
    this.save();
  }

  addXP(amount) {
    const before = this.level;
    this.state.xp += amount;
    this.save();
    return { leveledUp: this.level > before, level: this.level };
  }

  /**
   * Record a finished workout and evaluate badges.
   * session: { volumeKg, maxSetWeightKg }
   * Returns the list of newly unlocked badges.
   */
  recordWorkout(session) {
    const today = todayString();
    const last = this.state.lastWorkoutDate;

    if (last !== today) {
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
      this.state.streak = last === yesterday ? this.state.streak + 1 : 1;
      this.state.lastWorkoutDate = today;
    }
    this.state.totalWorkouts += 1;
    this.save();

    return this.evaluateBadges(session);
  }

  evaluateBadges(session = {}) {
    const checks = {
      "first-blood": this.state.totalWorkouts >= 1,
      "streak-3": this.state.streak >= 3,
      "week-warrior": this.state.streak >= 7,
      "iron-will": this.state.totalWorkouts >= 10,
      "century-club": (session.volumeKg ?? 0) >= 100,
      "heavy-lifter": (session.maxSetWeightKg ?? 0) >= 100,
      "macro-master": session.fullDayNutrition === true,
      "cardio-king": session.cardioOnly === true,
      legend: this.level >= MAX_LEVEL,
    };

    const newlyUnlocked = BADGES.filter(
      (badge) => checks[badge.id] && !this.state.badges.includes(badge.id)
    );
    if (newlyUnlocked.length > 0) {
      this.state.badges.push(...newlyUnlocked.map((b) => b.id));
      this.save();
    }
    return newlyUnlocked;
  }

  hasBadge(id) {
    return this.state.badges.includes(id);
  }
}
