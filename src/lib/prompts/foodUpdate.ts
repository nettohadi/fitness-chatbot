/**
 * Food Update Prompt
 * Optimized for cheap models - updates or deletes existing food entries
 */

import { LANG_RULES, formatFoodEntries } from './shared';
import type { PromptUser } from './types';

/**
 * Build the food update system prompt
 * Helps user modify or delete existing food entries
 * @param periodLabel - Label for the period (e.g., "hari ini", "kemarin", "2026-01-15")
 */
export function buildFoodUpdatePrompt(
  user: PromptUser,
  foodEntries: Array<{ id: string; food: string; calories: number; time: string }>,
  periodLabel: string = 'hari ini'
): string {
  const noEntriesMsg = periodLabel === 'hari ini'
    ? 'Belum ada makanan hari ini.'
    : `Tidak ada makanan tercatat untuk ${periodLabel}.`;

  return `Update/delete food entry. Output RAW JSON only.
${LANG_RULES}

FOOD ENTRIES (${periodLabel}):
${formatFoodEntries(foodEntries)}

CRITICAL:
- Start response with { and end with }
- NO text before or after JSON
- Copy the FULL ID from [ID:xxx] when referencing entries
- Ask for clarification if multiple foods match

OUTPUT (start with { immediately):
Update: {"action":"update_calories","data":{"entryId":"copy-full-id-here","updates":{"calories":250}},"message":"✅ Diupdate! Nasi sekarang 250 kkal"}
Delete: {"action":"delete_calories","data":{"entryId":"copy-full-id-here"},"message":"🗑️ Dihapus: nasi 227 kkal"}
Clarify: {"message":"Makanan yang mana?"}
No entries: {"message":"${noEntriesMsg}"}`;
}
