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
    const periodType = data.period; // 'week' or 'month'

    return `Generate fitness summary. Output PLAIN TEXT only (no JSON, no markdown).
${LANG_RULES}
USER: ${buildUserContext(user)}

CRITICAL: Use ONLY the data below. Translate ALL text to user's language.

DATA:
- Period type: ${periodType}
- Number of days: ${numDays}
- Daily breakdown:
${formatDailyBreakdown(data.dailyBreakdown)}
- Total: food=${data.caloriesConsumed}, exercise=${data.caloriesBurned}, deficit=${totalDeficit}
- Daily target: ${data.dailyGoal}

OUTPUT FORMAT:
📊 [This Week/This Month in user's language] ([N] [days in user's language])

[Day] [Date]: 🍽️[food] 🏃[exercise] 📉[deficit]
...

📈 Total: 🍽️[total_food] 🏃[total_exercise] 📉[total_deficit]
🎯 Target: [goal]/[day in user's language]

RULES:
- "week" → "Minggu Ini" (ID) / "This Week" (EN)
- "month" → "Bulan Ini" (ID) / "This Month" (EN)
- Translate day names (Mon→Sen, Tue→Sel, etc. for ID)
- 🍽️=food, 🏃=exercise, 📉=deficit
- Positive deficit = weight loss (good!), negative = surplus
- Add 1-2 sentences of encouragement
- Be brief!

⚠️ FORBIDDEN - NEVER SAY THESE (you are showing a summary, NOT saving data):
- "tersimpan" / "saved" / "dicatat" / "recorded" / "logged"
- "sudah saya simpan" / "sudah dicatat" / "I've logged"
- Any confirmation that data was saved - you are ONLY showing a summary`;
  }

  // For today/yesterday/specific: show food and exercise details
  // Deficit = TDEE + exercise - consumed (positive = calorie deficit, negative = surplus)
  const deficit = data.tdee + data.caloriesBurned - data.caloriesConsumed;

  // Get period type for LLM to translate
  const periodType = data.period; // 'today', 'yesterday', or 'specific'
  const specificDate = data.specificDate || '';

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

CRITICAL: Use ONLY the data below. Translate ALL text to user's language.

DATA:
- Period type: ${periodType}${specificDate ? ` (${specificDate})` : ''}
- Food total: ${data.caloriesConsumed}
- Exercise total: ${data.caloriesBurned}
- Deficit: ${deficit} (PRE-CALCULATED - use this exact value!)
- Remaining: ${remaining} (PRE-CALCULATED - use this exact value!)
- Daily target: ${data.dailyGoal}

FOOD LIST:
${foodList}

EXERCISE LIST:
${exerciseList}

OUTPUT FORMAT:
📊 [Period in user's language]

🍽️ [Food]: ${data.caloriesConsumed}
[food list]

🏃 [Exercise]: ${data.caloriesBurned}
[exercise list]

📉 [Deficit]: ${deficit} | ✅ [Remaining]: ${remaining}
🎯 Target: ${data.dailyGoal}/[day]

RULES:
- "today" → "Hari Ini" (ID) / "Today" (EN)
- "yesterday" → "Kemarin" (ID) / "Yesterday" (EN)
- "specific" → show the date
- Translate exercise types (cycling→sepeda, running→lari, etc. for ID)
- Translate all labels to user's language
- Positive deficit = weight loss (good!), negative = surplus
- Add 1-2 sentences of encouragement
- Be brief!

⚠️ FORBIDDEN - NEVER SAY THESE (you are showing a summary, NOT saving data):
- "tersimpan" / "saved" / "dicatat" / "recorded" / "logged"
- "sudah saya simpan" / "sudah dicatat" / "I've logged"
- Any confirmation that data was saved - you are ONLY showing a summary`;
}
