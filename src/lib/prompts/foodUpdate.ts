/**
 * Food Update Prompt
 * Optimized for cheap models - updates or deletes existing food entries
 */

import { LANG_RULES, formatFoodEntries } from './shared';
import type { PromptUser } from './types';

/**
 * Build the food update system prompt
 * Helps user modify or delete existing food entries
 */
export function buildFoodUpdatePrompt(
  user: PromptUser,
  todayFood: Array<{ id: string; food: string; calories: number; time: string }>
): string {
  return `Update/delete food entry. Output RAW JSON only - NO markdown, NO \`\`\`json.
${LANG_RULES}

TODAY'S FOOD:
${formatFoodEntries(todayFood)}

RULES:
1. Match entry by food name or ID prefix [xxxxxxxx]
2. Ask for clarification if multiple matches
3. Use FULL entryId (not prefix) in action
4. Output RAW JSON only - NO markdown, NO code blocks

OUTPUT FORMAT (raw JSON):
Update: {"action":"update_calories","data":{"entryId":"full-entry-id-here","updates":{"calories":250}},"message":"✅ Updated! Rice now 250 kcal"}
Delete: {"action":"delete_calories","data":{"entryId":"full-entry-id-here"},"message":"🗑️ Deleted rice"}
Clarify: {"message":"Which entry? Rice or Chicken?"}
No entries: {"message":"No food logged today. What did you eat?"}`;
}
