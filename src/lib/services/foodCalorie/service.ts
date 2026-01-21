/**
 * Food Calorie Service
 * Provides consistent calorie estimates by caching LLM estimates
 * Uses PostgreSQL pg_trgm for fuzzy matching on food names
 */
import { prisma } from '@/lib/prisma';

export interface FoodCalorieResult {
  id: string;
  name: string;
  caloriesPer100g: number;
  source: string;
  similarity?: number;
}

export interface SaveFoodCalorieInput {
  name: string;
  caloriesPer100g: number;
  source: 'ai' | 'user' | 'manual';
}

/**
 * Normalize food name for exact matching
 * Removes spaces, special chars, converts to lowercase
 */
export function normalizeFoodName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
    .trim();
}

/**
 * Find similar food in database using pg_trgm fuzzy matching
 * Returns the best match if similarity > threshold
 */
export async function findSimilarFood(
  foodName: string,
  similarityThreshold: number = 0.3
): Promise<FoodCalorieResult | null> {
  const normalized = normalizeFoodName(foodName);

  // First try exact match on normalized name (fastest)
  const exactMatch = await prisma.foodCalorie.findUnique({
    where: { nameNormalized: normalized },
  });

  if (exactMatch) {
    console.log(`[FoodCalorie] Exact match: "${foodName}" -> "${exactMatch.name}"`);
    // Increment usage count
    await prisma.foodCalorie.update({
      where: { id: exactMatch.id },
      data: { usageCount: { increment: 1 } },
    }).catch(() => {}); // Non-blocking

    return {
      id: exactMatch.id,
      name: exactMatch.name,
      caloriesPer100g: exactMatch.caloriesPer100g,
      source: exactMatch.source,
      similarity: 1.0,
    };
  }

  // Try fuzzy match using pg_trgm
  try {
    const results = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        calories_per_100g: number;
        source: string;
        sim: number;
      }>
    >`
      SELECT
        id,
        name,
        calories_per_100g,
        source,
        similarity(name, ${foodName}) as sim
      FROM food_calories
      WHERE similarity(name, ${foodName}) > ${similarityThreshold}
      ORDER BY sim DESC
      LIMIT 1
    `;

    if (results.length > 0) {
      const match = results[0];
      console.log(
        `[FoodCalorie] Fuzzy match: "${foodName}" -> "${match.name}" (similarity: ${match.sim.toFixed(2)})`
      );

      // Increment usage count
      await prisma.foodCalorie.update({
        where: { id: match.id },
        data: { usageCount: { increment: 1 } },
      }).catch(() => {}); // Non-blocking

      return {
        id: match.id,
        name: match.name,
        caloriesPer100g: match.calories_per_100g,
        source: match.source,
        similarity: match.sim,
      };
    }
  } catch (error) {
    // If pg_trgm is not available, fall back to normalized match only
    console.error('[FoodCalorie] Fuzzy search failed:', error);
  }

  console.log(`[FoodCalorie] No match found for: "${foodName}"`);
  return null;
}

/**
 * Save a new food calorie entry to database
 * Used after LLM estimates a new food
 */
export async function saveFoodCalorie(input: SaveFoodCalorieInput): Promise<FoodCalorieResult> {
  const normalized = normalizeFoodName(input.name);

  // Upsert - update if exists, create if not
  const result = await prisma.foodCalorie.upsert({
    where: { nameNormalized: normalized },
    update: {
      // Only update if the new source is more authoritative
      // user > manual > ai
      ...(input.source === 'user' || input.source === 'manual'
        ? {
            caloriesPer100g: input.caloriesPer100g,
            source: input.source,
          }
        : {}),
      usageCount: { increment: 1 },
    },
    create: {
      name: input.name,
      nameNormalized: normalized,
      caloriesPer100g: input.caloriesPer100g,
      source: input.source,
    },
  });

  console.log(`[FoodCalorie] Saved: "${input.name}" = ${input.caloriesPer100g} kcal/100g`);

  return {
    id: result.id,
    name: result.name,
    caloriesPer100g: result.caloriesPer100g,
    source: result.source,
  };
}

/**
 * Get best food match - main entry point for calorie lookup
 * Returns cached calorie data if found, null if LLM should estimate
 */
export async function getBestFoodMatch(foodName: string): Promise<FoodCalorieResult | null> {
  console.log(`[FoodCalorie] Looking up: "${foodName}"`);
  return findSimilarFood(foodName);
}
