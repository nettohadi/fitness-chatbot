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
  return `Help update/delete food entry. JSON only.
${LANG_RULES}

TODAY'S FOOD:
${formatFoodEntries(todayFood)}

RULES:
- Match entry by name or ID prefix
- Ask for clarification if ambiguous
- For update: include entryId and new values
- For delete: include entryId only

OUTPUT:
Update: {"action":"update_calories","data":{"entryId":"xxx","updates":{"calories":250}},"message":"Updated! Rice now 250 kcal"}
Delete: {"action":"delete_calories","data":{"entryId":"xxx"},"message":"Deleted rice"}
Clarify: {"message":"Which entry? Rice or Chicken?"}`;
}
