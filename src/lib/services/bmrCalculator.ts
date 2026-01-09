/**
 * Activity level multipliers for TDEE calculation
 */
export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_MULTIPLIERS;

/**
 * Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor equation
 *
 * Men: BMR = (10 × weight) + (6.25 × height) - (5 × age) + 5
 * Women: BMR = (10 × weight) + (6.25 × height) - (5 × age) - 161
 *
 * @param age - Age in years
 * @param gender - 'male' or 'female'
 * @param weightKg - Weight in kilograms
 * @param heightCm - Height in centimeters
 * @returns BMR in calories per day
 */
export function calculateBMR(
  age: number,
  gender: 'male' | 'female',
  weightKg: number,
  heightCm: number
): number {
  const baseBMR = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = gender === 'male' ? baseBMR + 5 : baseBMR - 161;

  return Math.round(bmr);
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 *
 * TDEE = BMR × Activity Multiplier
 *
 * @param bmr - Basal Metabolic Rate
 * @param activityLevel - Activity level (sedentary, light, moderate, active, very_active)
 * @returns TDEE in calories per day
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  return Math.round(bmr * multiplier);
}

/**
 * Calculate recommended daily calorie goal based on fitness goal
 *
 * - Maintenance: TDEE (maintain current weight)
 * - Deficit: TDEE - 500 (lose weight ~0.5kg/week)
 * - Surplus: TDEE + 300 (gain muscle)
 *
 * @param tdee - Total Daily Energy Expenditure
 * @param goal - Fitness goal
 * @returns Daily calorie goal
 */
export function calculateDailyGoal(
  tdee: number,
  goal: 'maintenance' | 'deficit' | 'surplus' = 'maintenance'
): number {
  switch (goal) {
    case 'deficit':
      return Math.round(tdee - 500);
    case 'surplus':
      return Math.round(tdee + 300);
    default:
      return tdee;
  }
}

/**
 * Calculate all fitness metrics at once
 *
 * @param age - Age in years
 * @param gender - 'male' or 'female'
 * @param weightKg - Weight in kilograms
 * @param heightCm - Height in centimeters
 * @param activityLevel - Activity level
 * @param goal - Fitness goal (optional, defaults to maintenance)
 * @returns Object with BMR, TDEE, and daily calorie goal
 */
export function calculateFitnessMetrics(
  age: number,
  gender: 'male' | 'female',
  weightKg: number,
  heightCm: number,
  activityLevel: ActivityLevel,
  goal: 'maintenance' | 'deficit' | 'surplus' = 'maintenance'
): {
  bmr: number;
  tdee: number;
  dailyCalorieGoal: number;
} {
  const bmr = calculateBMR(age, gender, weightKg, heightCm);
  const tdee = calculateTDEE(bmr, activityLevel);
  const dailyCalorieGoal = calculateDailyGoal(tdee, goal);

  return {
    bmr,
    tdee,
    dailyCalorieGoal,
  };
}
