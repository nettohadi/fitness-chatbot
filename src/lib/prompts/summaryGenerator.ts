/**
 * Summary Generator Prompt
 * Optimized for cheap models - generates friendly fitness summaries
 */

import { LANG_RULES, buildUserContext } from './shared';
import type { PromptUser, SummaryData } from './types';

/**
 * Format daily breakdown for week/month summaries
 * Uses English day names - LLM will translate to user's language
 * Format: Mon 20: 🍽️1600 🏃200 📉100
 */
function formatDailyBreakdown(breakdown: SummaryData['dailyBreakdown']): string {
  if (!breakdown || breakdown.length === 0) return 'No data';

  return breakdown.map(day => {
    const shortDay = day.dayName.substring(0, 3); // Mon, Tue, Wed, etc.
    const dayNum = day.date.split('-')[2]; // Get day number from YYYY-MM-DD
    return `${shortDay} ${dayNum}: 🍽️${day.consumed} 🏃${day.burned} 📉${day.deficit}`;
  }).join('\n');
}

/**
 * Build the summary generator system prompt
 * Generates friendly, encouraging fitness summaries
 */
export function buildSummaryPrompt(user: PromptUser, data: SummaryData): string {
  // Remaining = goal - consumed + exercise
  const remaining = data.dailyGoal - data.caloriesConsumed + data.caloriesBurned;

  // For week/month: show daily breakdown, no food/exercise details
  const isMultiDay = data.period === 'week' || data.period === 'month';

  if (isMultiDay && data.dailyBreakdown) {
    // For multi-day: sum up daily deficits (each day's deficit = TDEE + burned - consumed)
    const totalDeficit = data.dailyBreakdown.reduce((sum, day) => sum + day.deficit, 0);
    const numDays = data.dailyBreakdown.length;
    const periodKey = data.period === 'week' ? 'THIS_WEEK' : 'THIS_MONTH';

    return `Generate fitness summary. Output PLAIN TEXT only (no JSON, no markdown).
${LANG_RULES}
USER: ${buildUserContext(user)}

CRITICAL: Use ONLY the data below. Translate labels to user's language.

DATA:
- Period: ${periodKey} (${numDays} days)
- Daily breakdown:
${formatDailyBreakdown(data.dailyBreakdown)}
- Total: food=${data.caloriesConsumed}, exercise=${data.caloriesBurned}, deficit=${totalDeficit}
- Daily target: ${data.dailyGoal}

OUTPUT FORMAT (translate to user's language):
📊 [Period] ([N] days)

[Day] [Date]: 🍽️[food] 🏃[exercise] 📉[deficit]
...

📈 Total: 🍽️[total_food] 🏃[total_exercise] 📉[total_deficit]
🎯 Target: [goal]/day

RULES:
- Translate day names (Mon→Sen/Mon, Tue→Sel/Tue, etc.)
- Translate labels (Total, Target, days)
- 🍽️=food, 🏃=exercise, 📉=deficit
- Positive deficit = weight loss (good!), negative = surplus
- Add 1-2 sentences of encouragement
- Be brief!`;
  }

  // For today/yesterday/specific: show food and exercise details
  // Deficit = TDEE + exercise - consumed (positive = calorie deficit, negative = surplus)
  const deficit = data.tdee + data.caloriesBurned - data.caloriesConsumed;

  // Get period key for LLM to translate
  const periodKey = data.period === 'specific' ? data.specificDate : data.period.toUpperCase();

  // Format food entries compactly
  const foodList = data.foodEntries?.length
    ? data.foodEntries.map(e => `• ${e.food} (${e.calories})`).join('\n')
    : '(none)';

  // Format exercise entries compactly
  const exerciseList = data.exerciseEntries?.length
    ? data.exerciseEntries.map(e => `• ${e.type} ${e.duration}m (${e.calories})`).join('\n')
    : '(none)';

  return `Generate fitness summary. Output PLAIN TEXT only (no JSON, no markdown).
${LANG_RULES}
USER: ${buildUserContext(user)}

CRITICAL: Use ONLY the data below. Translate labels to user's language.

DATA:
- Period: ${periodKey}
- Food (${data.caloriesConsumed} total):
${foodList}
- Exercise (${data.caloriesBurned} total):
${exerciseList}
- Deficit: ${deficit}, Remaining: ${remaining}
- Daily target: ${data.dailyGoal}

OUTPUT FORMAT (translate to user's language):
📊 [Period]

🍽️ Food: [total]
[food list]

🏃 Exercise: [total]
[exercise list]

📉 Deficit: [deficit] | ✅ Remaining: [remaining]
🎯 Target: [goal]/day

RULES:
- Translate period (TODAY, YESTERDAY, or show date)
- Translate exercise types (cycling→sepeda, running→lari, etc.)
- Translate labels (Food, Exercise, Deficit, Remaining, Target)
- Positive deficit = weight loss (good!), negative = surplus
- Add 1-2 sentences of encouragement
- Be brief!`;
}
