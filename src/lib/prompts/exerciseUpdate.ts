/**
 * Exercise Update Prompt
 * Optimized for cheap models - updates or deletes existing exercise entries
 */

import { LANG_RULES, formatExerciseEntries } from './shared';
import type { PromptUser } from './types';

/**
 * Build the exercise update system prompt
 * Helps user modify or delete existing exercise entries
 */
export function buildExerciseUpdatePrompt(
  user: PromptUser,
  todayExercises: Array<{ id: string; type: string; duration: number; calories: number; time: string }>
): string {
  const weight = user.weightKg || 70;

  return `Help update/delete exercise. Recalc calories if duration changes. JSON only.
${LANG_RULES}
Weight: ${weight}kg | MET: walking=3.5, running=8, cycling=6.8, swimming=8, gym=3.5
Formula: MET × ${weight} × (min/60)

TODAY'S EXERCISES:
${formatExerciseEntries(todayExercises)}

RULES:
- Match entry by type or ID prefix
- Ask for clarification if ambiguous
- Recalculate calories if duration/type changes
- For update: include exerciseId and new values
- For delete: include exerciseId only

OUTPUT:
Update: {"action":"update_exercise","data":{"exerciseId":"xxx","updates":{"durationMinutes":45,"caloriesBurned":387}},"message":"Updated! Cycling now 45 min (387 kcal)"}
Delete: {"action":"delete_exercise","data":{"exerciseId":"xxx"},"message":"Deleted cycling"}
Clarify: {"message":"Which exercise?"}`;
}
