/**
 * FatSecret Food Search Service
 * Searches and caches food calorie data
 */
import { searchFoods, parseCaloriesFromDescription, parseServingFromDescription } from './client';

/**
 * Extract grams from serving string and calculate calories per 100g
 * Examples: "1122g" -> 1122, "100g" -> 100, "1 serving" -> null
 */
function extractGramsFromServing(serving: string): number | null {
  // Match patterns like "1122g", "100 g", "250g"
  const match = serving.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Calculate calories per 100g from total calories and serving size
 */
function calculateCaloriesPer100g(calories: number, serving: string): number | null {
  const grams = extractGramsFromServing(serving);
  if (grams && grams > 0) {
    return Math.round((calories / grams) * 100);
  }
  return null;
}

// Simple in-memory cache
const cache = new Map<string, CachedResult>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedResult {
  foods: FoodResult[];
  timestamp: number;
}

export interface FoodResult {
  name: string;
  calories: number;
  serving: string;
  caloriesPer100g: number | null; // Normalized calories per 100g for easy calculation
  source: 'fatsecret' | 'ai';
  fatSecretId?: string;
}

/**
 * Search for food calories
 * 1. Check cache
 * 2. Search FatSecret (supports Indonesian directly)
 * 3. Return results (or empty for LLM fallback)
 */
export async function searchFoodCalories(foodName: string): Promise<FoodResult[]> {
  const cacheKey = foodName.toLowerCase().trim();

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[FatSecret] Cache hit: ${cacheKey}`);
    return cached.foods;
  }

  // Search FatSecret directly (supports Indonesian)
  console.log(`[FatSecret] Searching: ${foodName}`);
  const results = await searchFoods(foodName, 3);

  if (results.length === 0) {
    console.log(`[FatSecret] No results for: ${foodName}`);
    return [];
  }

  // Parse results
  const foods: FoodResult[] = results
    .map((food) => {
      const calories = parseCaloriesFromDescription(food.food_description) || 0;
      const serving = parseServingFromDescription(food.food_description);
      return {
        name: food.food_name,
        calories,
        serving,
        caloriesPer100g: calculateCaloriesPer100g(calories, serving),
        source: 'fatsecret' as const,
        fatSecretId: food.food_id,
      };
    })
    .filter((f) => f.calories > 0);

  // Cache results
  if (foods.length > 0) {
    cache.set(cacheKey, { foods, timestamp: Date.now() });
  }

  return foods;
}

/**
 * Get best match for a food query
 * Returns null if no good match found (use LLM fallback)
 */
export async function getBestFoodMatch(foodName: string): Promise<FoodResult | null> {
  const results = await searchFoodCalories(foodName);
  return results.length > 0 ? results[0] : null;
}

/**
 * Clear the cache (useful for testing)
 */
export function clearCache(): void {
  cache.clear();
}
