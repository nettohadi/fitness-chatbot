/**
 * MET (Metabolic Equivalent of Task) values for common exercises
 * MET represents the energy cost of physical activities
 * 1 MET = resting metabolic rate
 */
export const MET_VALUES: Record<string, number> = {
  // Cardio
  walking: 3.5,
  running: 8.0,
  jogging: 7.0,
  cycling: 6.8,
  swimming: 8.0,
  'elliptical trainer': 5.0,
  rowing: 7.0,

  // Strength training
  gym: 3.5,
  weights: 3.5,
  'weight training': 3.5,
  bodyweight: 3.8,
  'strength training': 3.5,

  // Sports
  basketball: 6.5,
  soccer: 7.0,
  football: 8.0,
  tennis: 7.3,
  badminton: 5.5,
  volleyball: 4.0,
  'table tennis': 4.0,

  // Group fitness
  yoga: 2.5,
  pilates: 3.0,
  hiit: 8.0,
  zumba: 6.5,
  aerobics: 6.5,
  spinning: 8.5,
  crossfit: 8.0,

  // Other activities
  dancing: 4.8,
  hiking: 6.0,
  boxing: 9.0,
  'martial arts': 10.0,
  climbing: 8.0,
  skateboarding: 5.0,
  'jump rope': 10.0,
};

/**
 * Calculate calories burned during exercise
 *
 * Formula: Calories = MET × weight(kg) × duration(hours)
 *
 * @param exerciseType - Type of exercise
 * @param durationMinutes - Duration in minutes
 * @param weightKg - User's weight in kilograms
 * @returns Object with calories burned and MET value used
 */
export function calculateCaloriesBurned(
  exerciseType: string,
  durationMinutes: number,
  weightKg: number
): { calories: number; metValue: number } {
  // Get MET value (returns 5.0 default if exercise type not found)
  const metValue = getMetValue(exerciseType);

  const durationHours = durationMinutes / 60;
  const calories = metValue * weightKg * durationHours;

  return {
    calories: Math.round(calories),
    metValue,
  };
}

/**
 * Find the closest matching exercise type from MET values
 *
 * @param input - User's exercise input
 * @returns Matching exercise type or null if no match found
 */
/**
 * Find exercise type with fuzzy matching
 * Supports both exact English matches and Claude's translations
 *
 * @param input - Exercise type (can be from any language, Claude translates to English)
 * @returns Matched exercise key or null if not found
 */
export function findExerciseType(input: string): string | null {
  const normalized = input.toLowerCase().trim();

  // Exact match
  if (MET_VALUES[normalized]) {
    return normalized;
  }

  // Partial match (for slight variations)
  const matches = Object.keys(MET_VALUES).filter(
    (key) => key.includes(normalized) || normalized.includes(key)
  );

  if (matches.length > 0) {
    return matches[0];
  }

  // No match found - will use default MET value (5.0)
  // Claude should translate to English, but if it doesn't match exactly,
  // we'll use the input as-is and apply default MET
  console.warn(`⚠️ Exercise type not found in MET_VALUES: "${input}" - using default MET 5.0`);
  return null;
}

/**
 * Get all available exercise types
 *
 * @returns Array of exercise type names
 */
export function getAvailableExercises(): string[] {
  return Object.keys(MET_VALUES).sort();
}

/**
 * Get exercise suggestions based on partial input
 *
 * @param partial - Partial exercise name
 * @param limit - Maximum number of suggestions (default: 5)
 * @returns Array of suggested exercise names
 */
export function getSuggestions(partial: string, limit: number = 5): string[] {
  const normalized = partial.toLowerCase().trim();

  if (!normalized) {
    return [];
  }

  const matches = Object.keys(MET_VALUES).filter((key) =>
    key.startsWith(normalized) || key.includes(normalized)
  );

  return matches.slice(0, limit);
}

/**
 * Validate that a calculated calorie value matches the expected formula result
 *
 * @param metValue - MET value for the exercise
 * @param weightKg - User's weight in kilograms
 * @param durationMinutes - Duration in minutes
 * @param expectedCalories - The calorie value to validate
 * @returns True if the value is within acceptable tolerance (±2 kcal)
 */
export function validateExerciseCalculation(
  metValue: number,
  weightKg: number,
  durationMinutes: number,
  expectedCalories: number
): boolean {
  const calculated = Math.round(metValue * weightKg * (durationMinutes / 60));
  const tolerance = 2; // Allow 2 kcal difference for rounding
  return Math.abs(calculated - expectedCalories) <= tolerance;
}

/**
 * Get MET value for an exercise type
 * If exercise type is not found, returns default MET value
 *
 * @param exerciseType - Exercise type (should be in English)
 * @returns MET value for the exercise
 */
export function getMetValue(exerciseType: string): number {
  const normalized = exerciseType.toLowerCase().trim();
  return MET_VALUES[normalized] || 5.0; // Default MET if not found
}
