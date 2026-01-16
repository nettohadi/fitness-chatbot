/**
 * Summary Generator Prompt
 * Optimized for cheap models - generates friendly fitness summaries
 */

import { LANG_RULES, buildUserContext, formatFoodEntries, formatExerciseEntries } from './shared';
import type { PromptUser, SummaryData } from './types';

/**
 * Format daily breakdown for week/month summaries
 */
function formatDailyBreakdown(breakdown: SummaryData['dailyBreakdown']): string {
  if (!breakdown || breakdown.length === 0) return 'No data';

  return breakdown.map(day => {
    const deficitSign = day.deficit >= 0 ? '+' : '';
    return `${day.date} (${day.dayName}): 🍽️${day.consumed} | 💪${day.burned} | 📉${deficitSign}${day.deficit}`;
  }).join('\n');
}

/**
 * Build the summary generator system prompt
 * Generates friendly, encouraging fitness summaries
 */
export function buildSummaryPrompt(user: PromptUser, data: SummaryData): string {
  // Remaining = goal - consumed + exercise
  const remaining = data.dailyGoal - data.caloriesConsumed + data.caloriesBurned;
  // Deficit = TDEE + exercise - consumed (positive = calorie deficit, negative = surplus)
  const deficit = data.tdee + data.caloriesBurned - data.caloriesConsumed;

  // Format period label for display
  const periodLabel = data.period === 'specific' && data.specificDate
    ? data.specificDate // Show actual date like "2026-01-14"
    : data.period.toUpperCase();

  // For week/month: show daily breakdown, no food/exercise details
  const isMultiDay = data.period === 'week' || data.period === 'month';

  if (isMultiDay && data.dailyBreakdown) {
    return `Generate fitness summary for ${periodLabel}. Output PLAIN TEXT only (no JSON, no markdown).
${LANG_RULES}
USER: ${buildUserContext(user)}

${periodLabel} SUMMARY:
📊 Goal: ${data.dailyGoal} kcal/day
🍽️ Total Consumed: ${data.caloriesConsumed} kcal
💪 Total Exercise: ${data.caloriesBurned} kcal
📉 Total Deficit: ${deficit} kcal

DAILY BREAKDOWN (Date - Day: Consumed | Exercise | Deficit):
${formatDailyBreakdown(data.dailyBreakdown)}

RULES:
- Show totals first, then daily breakdown
- Translate day names to user's language (Monday→Senin, etc.)
- Format: Date (DayName): Consumed | Exercise | Deficit
- Positive deficit = weight loss (good!), negative = surplus
- NO food items, NO IDs - just daily totals
- Be encouraging!`;
  }

  // For today/yesterday/specific: show food and exercise details
  return `Generate fitness summary. Output PLAIN TEXT only (no JSON, no markdown).
${LANG_RULES}
USER: ${buildUserContext(user)}

${periodLabel}'S DATA (translate labels to user's language):
📊 Goal: ${data.dailyGoal} kcal/day
🍽️ Consumed: ${data.caloriesConsumed} kcal
💪 Exercise: ${data.caloriesBurned} kcal
✅ Remaining: ${remaining} kcal
📉 Deficit: ${deficit} kcal

FOOD LOGGED (${data.foodEntries?.length || 0} items):
${formatFoodEntries(data.foodEntries || [])}

EXERCISE LOGGED (${data.exerciseEntries?.length || 0} items):
${formatExerciseEntries(data.exerciseEntries || [])}

RULES:
- Show 5 metrics: Goal, Consumed, Exercise, Remaining, Deficit
- Remaining = Goal - Consumed + Exercise
- Deficit = TDEE (${data.tdee}) + Exercise - Consumed
- Positive deficit = losing weight (good!), negative = surplus
- TRANSLATE exercise types (cycling→sepeda, running→lari, etc.)
- List food and exercise entries
- Be encouraging!`;
}
