// ExerciseDB API wrapper. Falls back to MOCK_EXERCISES when no key is
// configured, so the app works before the RapidAPI key exists and during
// development without burning the 10 req/day free tier.

const BASE_URL = "https://edb-with-videos-and-images-by-ascendapi.p.rapidapi.com";
const API_HOST = "edb-with-videos-and-images-by-ascendapi.p.rapidapi.com";
const CACHE_PREFIX = "liftlore_cache_";

// Our filter groups → AscendAPI bodyParts values (uppercase taxonomy)
const BODY_PART_MAP = {
  chest: ["CHEST"],
  back: ["BACK"],
  legs: ["THIGHS", "QUADRICEPS", "HAMSTRINGS", "CALVES"],
  shoulders: ["SHOULDERS"],
  arms: ["UPPER ARMS", "BICEPS", "TRICEPS", "FOREARMS"],
  core: ["WAIST"],
};

const MOCK_EXERCISES = [
  { id: "m01", name: "barbell bench press", muscle: "chest", target: "pectorals", equipment: "barbell" },
  { id: "m02", name: "incline dumbbell press", muscle: "chest", target: "pectorals", equipment: "dumbbell" },
  { id: "m03", name: "push-up", muscle: "chest", target: "pectorals", equipment: "body weight" },
  { id: "m04", name: "cable fly", muscle: "chest", target: "pectorals", equipment: "cable" },
  { id: "m05", name: "deadlift", muscle: "back", target: "spinal erectors", equipment: "barbell" },
  { id: "m06", name: "pull-up", muscle: "back", target: "lats", equipment: "body weight" },
  { id: "m07", name: "bent-over barbell row", muscle: "back", target: "upper back", equipment: "barbell" },
  { id: "m08", name: "lat pulldown", muscle: "back", target: "lats", equipment: "cable" },
  { id: "m09", name: "barbell back squat", muscle: "legs", target: "quads", equipment: "barbell" },
  { id: "m10", name: "romanian deadlift", muscle: "legs", target: "hamstrings", equipment: "barbell" },
  { id: "m11", name: "leg press", muscle: "legs", target: "quads", equipment: "machine" },
  { id: "m12", name: "walking lunge", muscle: "legs", target: "glutes", equipment: "dumbbell" },
  { id: "m13", name: "standing calf raise", muscle: "legs", target: "calves", equipment: "machine" },
  { id: "m14", name: "overhead press", muscle: "shoulders", target: "delts", equipment: "barbell" },
  { id: "m15", name: "lateral raise", muscle: "shoulders", target: "delts", equipment: "dumbbell" },
  { id: "m16", name: "face pull", muscle: "shoulders", target: "rear delts", equipment: "cable" },
  { id: "m17", name: "barbell curl", muscle: "arms", target: "biceps", equipment: "barbell" },
  { id: "m18", name: "hammer curl", muscle: "arms", target: "biceps", equipment: "dumbbell" },
  { id: "m19", name: "triceps rope pushdown", muscle: "arms", target: "triceps", equipment: "cable" },
  { id: "m20", name: "skull crusher", muscle: "arms", target: "triceps", equipment: "barbell" },
  { id: "m21", name: "plank", muscle: "core", target: "abs", equipment: "body weight" },
  { id: "m22", name: "hanging leg raise", muscle: "core", target: "abs", equipment: "body weight" },
  { id: "m23", name: "cable crunch", muscle: "core", target: "abs", equipment: "cable" },
  { id: "m24", name: "russian twist", muscle: "core", target: "obliques", equipment: "body weight" },
];

export default class ExerciseDB {
  constructor(apiKey = "") {
    this.apiKey = apiKey;
  }

  get isLive() {
    return this.apiKey.length > 0;
  }

  async searchByName(query) {
    const q = query.trim().toLowerCase();
    if (!this.isLive) {
      return MOCK_EXERCISES.filter((ex) => ex.name.includes(q));
    }
    const data = await this.#fetchCached(`/api/v1/exercises?name=${encodeURIComponent(q)}&limit=10`);
    return toArray(data).map(normalize);
  }

  async getByMuscle(group) {
    if (!this.isLive) {
      return group === "all"
        ? MOCK_EXERCISES
        : MOCK_EXERCISES.filter((ex) => ex.muscle === group);
    }
    if (group === "all") {
      const data = await this.#fetchCached("/api/v1/exercises?limit=30");
      return toArray(data).map(normalize);
    }
    const parts = BODY_PART_MAP[group] ?? [group.toUpperCase()];
    const results = await Promise.all(
      parts.map((p) =>
        this.#fetchCached(`/api/v1/exercises?bodyParts=${encodeURIComponent(p)}&limit=15`)
      )
    );
    // De-dupe: an exercise tagged with several body parts appears in
    // multiple responses (e.g. BICEPS and UPPER ARMS)
    const seen = new Set();
    return results
      .flatMap(toArray)
      .map(normalize)
      .filter((ex) => !seen.has(ex.id) && seen.add(ex.id));
  }

  async #fetchCached(path) {
    const cacheKey = CACHE_PREFIX + path;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);

    const res = await fetch(BASE_URL + path, {
      headers: {
        "x-rapidapi-key": this.apiKey,
        "x-rapidapi-host": API_HOST,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      throw new Error(`ExerciseDB request failed (${res.status})`);
    }
    const data = await res.json();
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
    return data;
  }
}

// AscendAPI wraps results in { success, meta, data: [...] }
function toArray(data) {
  return Array.isArray(data) ? data : (data?.data ?? []);
}

// Map a raw AscendAPI record to the shape the rest of the app uses.
// API values are ALL CAPS; lowercase them for display.
function normalize(raw) {
  return {
    id: raw.exerciseId,
    name: raw.name.trim().toLowerCase(),
    muscle: bodyPartsToGroup(raw.bodyParts ?? []),
    target: (raw.targetMuscles?.[0] ?? "").toLowerCase(),
    equipment: (raw.equipments?.[0] ?? "").toLowerCase(),
    imageUrl: raw.imageUrl ?? null,
  };
}

function bodyPartsToGroup(bodyParts) {
  for (const [group, parts] of Object.entries(BODY_PART_MAP)) {
    if (bodyParts.some((bp) => parts.includes(bp))) return group;
  }
  return (bodyParts[0] ?? "").toLowerCase();
}
