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

  return `Update/delete food entry. ALWAYS ASK CONFIRMATION FIRST. Output RAW JSON only.
${LANG_RULES}

FOOD ENTRIES (${periodLabel}):
${formatFoodEntries(foodEntries)}

⚠️ CRITICAL RULES:
1. Start response with { and end with }
2. NO text before or after JSON
3. The entryId MUST be copied EXACTLY from [ID:xxx] - character for character!
4. NEVER modify, guess, or generate IDs - only use IDs shown above
5. If user says "yang terakhir/barusan/tadi" → use the LAST entry in the list above
6. If unclear which entry, ask for clarification
7. ALWAYS ask confirmation WITH explicit options: "Yakin? (Ya/Tidak)" or "Sure? (Yes/No)"
8. Support MULTIPLE entries - user can say "hapus semua" or "hapus nasi dan ayam"

TWO-STEP FLOW:
Step 1 - Ask confirmation (include pending action in hidden tag):
{"message":"🗑️ Hapus nasi 227 kkal?\\n\\nYakin? (Ya/Tidak)<!--PENDING:{\\"action\\":\\"delete_calories\\",\\"data\\":{\\"entryId\\":\\"xxx\\"}}-->"}

Step 2 - When user confirms (says "ya/yes"), the system will extract and execute the pending action.

CONFIRMATION (user says "ya/yes/ok" after seeing pending action):
If previous message has <!--PENDING:...--> tag, extract the action and execute:
{"action":"delete_calories","data":{"entryId":"xxx"},"message":"✅ Dihapus: nasi 227 kkal"}

DELETE MULTIPLE:
{"message":"🗑️ Hapus 2 makanan?\\n- Nasi: 227 kkal\\n- Ayam: 300 kkal\\n\\nYakin? (Ya/Tidak)<!--PENDING:{\\"action\\":\\"delete_calories\\",\\"data\\":{\\"entryIds\\":[\\"id1\\",\\"id2\\"]}}-->"}

UPDATE:
{"message":"📝 Update nasi jadi 300 kkal?\\n\\nYakin? (Ya/Tidak)<!--PENDING:{\\"action\\":\\"update_calories\\",\\"data\\":{\\"entryId\\":\\"xxx\\",\\"updates\\":{\\"calories\\":300}}}-->"}

Clarify: {"message":"Makanan yang mana?"}
No entries: {"message":"${noEntriesMsg}"}`;
}
