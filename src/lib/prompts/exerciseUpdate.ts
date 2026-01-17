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

  return `Update/delete exercise. Output RAW JSON only.
${LANG_RULES}

USER: Weight ${weight}kg
MET VALUES: walking=3.5, running=8, cycling=6.8, swimming=8, gym=3.5
FORMULA: MET × ${weight}kg × (min/60)

EXERCISES (${periodLabel}):
${formatExerciseEntries(exerciseEntries)}

CRITICAL:
- Start response with { and end with }
- NO text before or after JSON
- Copy the FULL ID from [ID:xxx] when referencing entries
- RECALCULATE calories if duration/type changes
- Ask for clarification if multiple exercises match

OUTPUT (start with { immediately):
Update: {"action":"update_exercise","data":{"exerciseId":"copy-full-id-here","updates":{"durationMinutes":45,"caloriesBurned":${Math.round(6.8 * weight * 0.75)}}},"message":"✅ Diupdate! Cycling sekarang 45 menit (${Math.round(6.8 * weight * 0.75)} kkal)"}
Delete: {"action":"delete_exercise","data":{"exerciseId":"copy-full-id-here"},"message":"🗑️ Dihapus: cycling 30 menit"}
Clarify: {"message":"Olahraga yang mana?"}
No entries: {"message":"${noEntriesMsg}"}`;
}
