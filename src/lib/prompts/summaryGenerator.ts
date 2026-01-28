/**
 * Summary Generator Prompt
 * Optimized for cheap models - generates friendly fitness summaries
 */

import { LANG_RULES, buildUserContext } from './shared';
import type { PromptUser, SummaryData } from './types';

/**
 * Format number to max 1 decimal place
 */
function formatNum(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
}

/**
 * Get calorie unit based on user's preferred language
 * Indonesian: "kkal", English: "kcal"
 */
function getCalorieUnit(language?: string | null): string {
  return language === 'id' ? 'kkal' : 'kcal';
}

/**
 * Format daily breakdown for week/month summaries
 * Uses English day names - LLM will translate to user's language
 * Format: Mon 20: 🍽️1600 kkal 🏃200 kkal 📉100 kkal
 */
function formatDailyBreakdown(breakdown: SummaryData['dailyBreakdown'], unit: string): string {
  if (!breakdown || breakdown.length === 0) return 'No data';

  return breakdown.map(day => {
    const shortDay = day.dayName.substring(0, 3); // Mon, Tue, Wed, etc.
    const dayNum = day.date.split('-')[2]; // Get day number from YYYY-MM-DD
    return `${shortDay} ${dayNum}: 🍽️${formatNum(day.consumed)} ${unit} 🏃${formatNum(day.burned)} ${unit} 📉${formatNum(day.deficit)} ${unit}`;
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

  // Get calorie unit based on user's language
  const unit = getCalorieUnit(user.preferredLanguage);

  if (isMultiDay && data.dailyBreakdown) {
    // For multi-day: sum up daily deficits (each day's deficit = TDEE + burned - consumed)
    const totalDeficit = data.dailyBreakdown.reduce((sum, day) => sum + day.deficit, 0);
    const numDays = data.dailyBreakdown.length;
    const periodType = data.period; // 'week' or 'month'

    return `Generate fitness summary. Output PLAIN TEXT only (no JSON, no markdown).
${LANG_RULES}
USER: ${buildUserContext(user)}

CRITICAL: Use ONLY the data below. Translate ALL text to user's language.
IMPORTANT: Always include calorie unit "${unit}" after calorie values.

DATA:
- Period type: ${periodType}
- Number of days: ${numDays}
- Calorie unit: ${unit}
- Daily breakdown:
${formatDailyBreakdown(data.dailyBreakdown, unit)}
- Total: food=${formatNum(data.caloriesConsumed)} ${unit}, exercise=${formatNum(data.caloriesBurned)} ${unit}, deficit=${formatNum(totalDeficit)} ${unit}
- Daily target: ${formatNum(data.dailyGoal)} ${unit}

OUTPUT FORMAT:
📊 [This Week/This Month in user's language] ([N] [days in user's language])

[Day] [Date]: 🍽️[food] ${unit} 🏃[exercise] ${unit} 📉[deficit] ${unit}
...

📈 Total: 🍽️[total_food] ${unit} 🏃[total_exercise] ${unit} 📉[total_deficit] ${unit}
🎯 Target: [goal] ${unit}/[day in user's language]

RULES:
- "week" → "Minggu Ini" (ID) / "This Week" (EN)
- "month" → "Bulan Ini" (ID) / "This Month" (EN)
- Translate day names (Mon→Sen, Tue→Sel, etc. for ID)
- 🍽️=food, 🏃=exercise, 📉=deficit
- ALWAYS include "${unit}" after calorie numbers
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

  // Format food entries compactly with calorie unit
  const foodList = data.foodEntries?.length
    ? data.foodEntries.map(e => `• ${e.food} (${formatNum(e.calories)} ${unit})`).join('\n')
    : '(none)';

  // Format exercise entries compactly with calorie unit
  const exerciseList = data.exerciseEntries?.length
    ? data.exerciseEntries.map(e => `• ${e.type} ${e.duration}m (${formatNum(e.calories)} ${unit})`).join('\n')
    : '(none)';

  return `Generate fitness summary. Output PLAIN TEXT only (no JSON, no markdown).
${LANG_RULES}
USER: ${buildUserContext(user)}

CRITICAL: Use ONLY the data below. Translate ALL text to user's language.
IMPORTANT: Always include calorie unit "${unit}" after calorie values.

DATA:
- Period type: ${periodType}${specificDate ? ` (${specificDate})` : ''}
- Calorie unit: ${unit}
- Food total: ${formatNum(data.caloriesConsumed)} ${unit}
- Exercise total: ${formatNum(data.caloriesBurned)} ${unit}
- Deficit: ${formatNum(deficit)} ${unit} (PRE-CALCULATED - use this exact value!)
- Remaining: ${formatNum(remaining)} ${unit} (PRE-CALCULATED - use this exact value!)
- Daily target: ${formatNum(data.dailyGoal)} ${unit}

FOOD LIST:
${foodList}

EXERCISE LIST:
${exerciseList}

OUTPUT FORMAT:
📊 [Period in user's language]

🍽️ [Food]: ${formatNum(data.caloriesConsumed)} ${unit}
[food list with ${unit}]

🏃 [Exercise]: ${formatNum(data.caloriesBurned)} ${unit}
[exercise list with ${unit}]

📉 [Deficit]: ${formatNum(deficit)} ${unit} | ✅ [Remaining]: ${formatNum(remaining)} ${unit}
🎯 Target: ${formatNum(data.dailyGoal)} ${unit}/[day]

RULES:
- "today" → "Hari Ini" (ID) / "Today" (EN)
- "yesterday" → "Kemarin" (ID) / "Yesterday" (EN)
- "specific" → show the date
- Translate exercise types (cycling→sepeda, running→lari, etc. for ID)
- Translate all labels to user's language
- ALWAYS include "${unit}" after calorie numbers
- Positive deficit = weight loss (good!), negative = surplus
- Add 1-2 sentences of encouragement
- Be brief!

⚠️ FORBIDDEN - NEVER SAY THESE (you are showing a summary, NOT saving data):
- "tersimpan" / "saved" / "dicatat" / "recorded" / "logged"
- "sudah saya simpan" / "sudah dicatat" / "I've logged"
- Any confirmation that data was saved - you are ONLY showing a summary`;
}
