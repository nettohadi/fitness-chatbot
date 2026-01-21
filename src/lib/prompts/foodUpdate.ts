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

⚠️ CRITICAL ID RULES - FOLLOW EXACTLY:
1. Start response with { and end with }
2. NO text before or after JSON
3. The entryId MUST be copied EXACTLY from [ID:xxx] - character for character!
4. NEVER modify, guess, or generate IDs - only use IDs shown above
5. If user says "yang terakhir/barusan/tadi" → use the LAST entry in the list above
6. If unclear which entry, ask for clarification

OUTPUT (start with { immediately):
Update: {"action":"update_calories","data":{"entryId":"COPY-EXACT-ID-FROM-LIST","updates":{"calories":250}},"message":"✅ Diupdate! Nasi sekarang 250 kkal"}
Delete: {"action":"delete_calories","data":{"entryId":"COPY-EXACT-ID-FROM-LIST"},"message":"🗑️ Dihapus: nasi 227 kkal"}
Clarify: {"message":"Makanan yang mana?"}
No entries: {"message":"${noEntriesMsg}"}`;
}
