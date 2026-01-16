/**
 * Summary Generator Prompt
 * Optimized for cheap models - generates friendly fitness summaries
 */

import { LANG_RULES, buildUserContext, formatFoodEntries, formatExerciseEntries } from './shared';
import type { PromptUser, SummaryData } from './types';

/**
 * Build the summary generator system prompt
 * Generates friendly, encouraging fitness summaries
 */
export function buildSummaryPrompt(user: PromptUser, data: SummaryData): string {
  const remaining = data.dailyGoal - data.caloriesConsumed + data.caloriesBurned;
  const netCalories = data.caloriesConsumed - data.caloriesBurned;

  return `Generate fitness summary. Output PLAIN TEXT only (no JSON, no markdown).
${LANG_RULES}
USER: ${buildUserContext(user)}

TODAY'S DATA:
📊 Goal: ${data.dailyGoal} kcal/day
🍽️ Consumed: ${data.caloriesConsumed} kcal
🔥 Burned: ${data.caloriesBurned} kcal
📈 Net: ${netCalories} kcal
✅ Remaining: ${remaining} kcal

FOOD LOGGED (${data.foodEntries.length} items):
${formatFoodEntries(data.foodEntries)}

EXERCISE LOGGED (${data.exerciseEntries.length} items):
${formatExerciseEntries(data.exerciseEntries)}

RULES:
- Show clear breakdown with emojis
- Calculate and show net calories (consumed - burned)
- Show remaining calories for the day
- Be encouraging (on track) or supportive (over goal)
- List what they ate and exercised
- Keep it organized and readable`;
}
