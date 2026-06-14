// USDA FoodData Central API wrapper. Search-by-name against the US government
// food database — fully free, no premium-gated fields. Falls back to a
// deterministic mock estimate when no key is configured, so food logging works
// before the key exists and during development without spending the quota.
//
// Macro values are reported per 100 g of the food (FDC's standard basis).

const BASE_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";

// USDA nutrient numbers (stable codes, same across all food data types)
const NUTRIENT = {
  energy: "208", // kcal
  protein: "203",
  fat: "204",
  carbs: "205",
};

export default class NutritionAPI {
  constructor(apiKey = "") {
    this.apiKey = apiKey;
    // Dedupe identical queries within a session to avoid duplicate requests
    this.cache = new Map();
  }

  get isLive() {
    return this.apiKey.length > 0;
  }

  /**
   * Search foods by name.
   * Returns an array of { name, calories, protein, carbs, fat,
   * servingQty, servingUnit } — macros per 100 g.
   */
  async search(query) {
    const q = query.trim();
    if (q.length === 0) return [];

    const cacheKey = q.toLowerCase();
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    const foods = this.isLive ? await this.#fetchLive(q) : mockFoods(q);
    this.cache.set(cacheKey, foods);
    return foods;
  }

  async #fetchLive(query) {
    const params = new URLSearchParams({
      api_key: this.apiKey,
      query,
      // Curated generic foods only — excluding "Branded" drops the hundreds of
      // near-duplicate packaged products that clutter results with conflicting
      // calorie values.
      dataType: "Foundation,SR Legacy,Survey (FNDDS)",
      pageSize: "10",
    });
    const res = await fetch(`${BASE_URL}?${params}`);
    if (!res.ok) {
      throw new Error(`FoodData Central request failed (${res.status})`);
    }
    const data = await res.json();
    return (data.foods ?? []).map(normalize);
  }
}

// Pull a nutrient's rounded value from a food's foodNutrients array.
function nutrientValue(food, number) {
  const match = (food.foodNutrients ?? []).find(
    (n) => n.nutrientNumber === number
  );
  return match ? Math.round(match.value) : 0;
}

// Map a raw FDC food record to the shape the app uses.
function normalize(food) {
  return {
    name: (food.description ?? "").toLowerCase(),
    calories: nutrientValue(food, NUTRIENT.energy),
    protein: nutrientValue(food, NUTRIENT.protein),
    carbs: nutrientValue(food, NUTRIENT.carbs),
    fat: nutrientValue(food, NUTRIENT.fat),
    servingQty: 100,
    servingUnit: "g",
  };
}

// Deterministic mock so the same query always returns the same estimate.
// Not nutritionally accurate — just enough to exercise the UI offline.
function mockFoods(query) {
  const name = query.toLowerCase();
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 1000;
  const protein = 8 + (hash % 30);
  const carbs = 10 + (hash % 40);
  const fat = 2 + (hash % 18);
  return [
    {
      name,
      calories: protein * 4 + carbs * 4 + fat * 9,
      protein,
      carbs,
      fat,
      servingQty: 100,
      servingUnit: "g",
    },
  ];
}
