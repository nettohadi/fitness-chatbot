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
  // Remaining = goal - consumed + exercise
  const remaining = data.dailyGoal - data.caloriesConsumed + data.caloriesBurned;
  // Deficit = TDEE + exercise - consumed (positive = calorie deficit, negative = surplus)
  const deficit = data.tdee + data.caloriesBurned - data.caloriesConsumed;

  return `Generate fitness summary. Output PLAIN TEXT only (no JSON, no markdown).
${LANG_RULES}
USER: ${buildUserContext(user)}

${data.period.toUpperCase()}'S DATA (translate labels to user's language):
📊 Goal: ${data.dailyGoal} kcal/day
🍽️ Consumed: ${data.caloriesConsumed} kcal
💪 Exercise: ${data.caloriesBurned} kcal
✅ Remaining: ${remaining} kcal
📉 Deficit: ${deficit} kcal

FOOD LOGGED (${data.foodEntries.length} items):
${formatFoodEntries(data.foodEntries)}

EXERCISE LOGGED (${data.exerciseEntries.length} items):
${formatExerciseEntries(data.exerciseEntries)}

RULES:
- Show 5 metrics: Goal, Consumed, Exercise, Remaining, Deficit
- Remaining = Goal - Consumed + Exercise
- Deficit = TDEE (${data.tdee}) + Exercise - Consumed
- Positive deficit = losing weight (good!), negative = surplus
- TRANSLATE exercise types (cycling→sepeda, running→lari, etc.)
- List food and exercise entries
- Be encouraging!`;
}
