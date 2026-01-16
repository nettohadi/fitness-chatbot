/**
 * Food Logger - NO LLM NEEDED
 *
 * When user confirms ("yes"), we already have pending food from the estimate.
 * Just save to database and generate confirmation message programmatically.
 */

import type { PromptUser, PendingFood, FoodLoggerResult } from './types';

/**
 * Generate food save action and confirmation message (NO LLM CALL)
 * This is called when user confirms saving food after an estimate
 */
export function generateFoodSaveAction(
  user: PromptUser,
  pendingFood: PendingFood,
  todayCalories: number
): FoodLoggerResult {
  const goal = user.dailyCalorieGoal ? Math.round(user.dailyCalorieGoal) : 2000;
  const pendingTotal = pendingFood.items.reduce((sum, item) => sum + item.calories, 0);
  const newTotal = todayCalories + pendingTotal;

  // Build the items array for the save action
  const items = pendingFood.items.map(item => ({
    foodDescription: item.food,
    calories: item.calories,
    estimatedByAi: true,
  }));

  // Generate confirmation message
  const foodList = pendingFood.items
    .map(item => `${item.food}: ${item.calories} kcal`)
    .join(', ');

  const message = pendingFood.items.length === 1
    ? `Saved! ${foodList}. Today: ${newTotal}/${goal} kcal`
    : `Saved ${pendingFood.items.length} items! ${foodList}. Total today: ${newTotal}/${goal} kcal`;

  return {
    action: 'save_calories',
    data: { items },
    message,
  };
}
