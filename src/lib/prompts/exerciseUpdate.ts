/**
 * Exercise Update Prompt
 * Optimized for cheap models - updates or deletes existing exercise entries
 */

import { LANG_RULES, formatExerciseEntries } from './shared';
import type { PromptUser } from './types';

/**
 * Build the exercise update system prompt
 * Helps user modify or delete existing exercise entries
 * @param periodLabel - Label for the period (e.g., "hari ini", "kemarin", "2026-01-15")
 */
export function buildExerciseUpdatePrompt(
  user: PromptUser,
  exerciseEntries: Array<{ id: string; type: string; duration: number; calories: number; time: string }>,
  periodLabel: string = 'hari ini'
): string {
  const weight = user.weightKg || 70;
  const noEntriesMsg = periodLabel === 'hari ini'
    ? 'Belum ada olahraga hari ini.'
    : `Tidak ada olahraga tercatat untuk ${periodLabel}.`;

  return `Update/delete exercise. ALWAYS ASK CONFIRMATION FIRST. Output RAW JSON only.
${LANG_RULES}

USER: Weight ${weight}kg
MET VALUES: walking=3.5, running=8, cycling=6.8, swimming=8, gym=3.5
FORMULA: MET × ${weight}kg × (min/60)

EXERCISES (${periodLabel}):
${formatExerciseEntries(exerciseEntries)}

⚠️ CRITICAL RULES:
- Start response with { and end with }
- NO text before or after JSON
- Copy the FULL ID from [ID:xxx] when referencing entries
- RECALCULATE calories if duration/type changes
- Ask for clarification if multiple exercises match
- ALWAYS ask confirmation WITH explicit options: "Yakin? (Ya/Tidak)" or "Sure? (Yes/No)"
- Support MULTIPLE entries - user can say "hapus semua" or "hapus lari dan sepeda"

TWO-STEP FLOW:
Step 1 - Ask confirmation (include pending action in hidden tag):
{"message":"🗑️ Hapus cycling 30 menit (170 kkal)?\\n\\nYakin? (Ya/Tidak)<!--PENDING:{\\"action\\":\\"delete_exercise\\",\\"data\\":{\\"exerciseId\\":\\"xxx\\"}}-->"}

Step 2 - When user confirms (says "ya/yes"), the system will extract and execute the pending action.

CONFIRMATION (user says "ya/yes/ok" after seeing pending action):
If previous message has <!--PENDING:...--> tag, extract the action and execute:
{"action":"delete_exercise","data":{"exerciseId":"xxx"},"message":"✅ Dihapus: cycling 30 menit"}

DELETE MULTIPLE:
{"message":"🗑️ Hapus 2 olahraga?\\n- Lari 30 menit: 280 kkal\\n- Sepeda 45 menit: 238 kkal\\n\\nYakin? (Ya/Tidak)<!--PENDING:{\\"action\\":\\"delete_exercise\\",\\"data\\":{\\"exerciseIds\\":[\\"id1\\",\\"id2\\"]}}-->"}

UPDATE:
{"message":"📝 Update cycling jadi 45 menit (${Math.round(6.8 * weight * 0.75)} kkal)?\\n\\nYakin? (Ya/Tidak)<!--PENDING:{\\"action\\":\\"update_exercise\\",\\"data\\":{\\"exerciseId\\":\\"xxx\\",\\"updates\\":{\\"durationMinutes\\":45,\\"caloriesBurned\\":${Math.round(6.8 * weight * 0.75)}}}}-->"}

Clarify: {"message":"Olahraga yang mana?"}
No entries: {"message":"${noEntriesMsg}"}`;
}
