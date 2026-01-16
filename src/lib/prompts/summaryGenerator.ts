/**
 * Summary Generator Prompt
 * Optimized for cheap models - generates friendly fitness summaries
 */

import { LANG_RULES, buildUserContext } from './shared';
import type { PromptUser, SummaryData } from './types';

/**
 * Build the summary generator system prompt
 * Generates friendly, encouraging fitness summaries
 */
export function buildSummaryPrompt(user: PromptUser, data: SummaryData): string {
  const remaining = data.dailyGoal - data.caloriesConsumed + data.caloriesBurned;

  return `Generate friendly fitness summary. Be encouraging. Plain text only (no JSON).
${LANG_RULES}
USER: ${buildUserContext(user)}

DATA:
Period: ${data.period}
Consumed: ${data.caloriesConsumed} kcal
Burned: ${data.caloriesBurned} kcal
Goal: ${data.dailyGoal} kcal/day
Remaining: ${remaining} kcal
Food entries: ${data.foodEntries.length}
Exercise entries: ${data.exerciseEntries.length}

RULES:
- Be conversational, not robotic
- Highlight achievements
- Be encouraging
- For today: mention remaining calories
- Keep it brief (2-4 sentences)`;
}
