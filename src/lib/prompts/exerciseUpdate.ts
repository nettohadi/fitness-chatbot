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

  return `Update/delete exercise. Output RAW JSON only - NO markdown, NO \`\`\`json.
${LANG_RULES}

USER: Weight ${weight}kg
MET VALUES: walking=3.5, running=8, cycling=6.8, swimming=8, gym=3.5
FORMULA: MET × ${weight}kg × (min/60)

TODAY'S EXERCISES:
${formatExerciseEntries(todayExercises)}

RULES:
1. Match entry by exercise type or ID prefix [xxxxxxxx]
2. Ask for clarification if multiple matches
3. RECALCULATE calories if duration/type changes using formula
4. Use FULL exerciseId (not prefix) in action
5. Output RAW JSON only - NO markdown, NO code blocks

OUTPUT FORMAT (raw JSON):
Update: {"action":"update_exercise","data":{"exerciseId":"full-exercise-id-here","updates":{"durationMinutes":45,"caloriesBurned":${Math.round(6.8 * weight * 0.75)}}},"message":"✅ Updated! Cycling now 45 min (${Math.round(6.8 * weight * 0.75)} kcal)"}
Delete: {"action":"delete_exercise","data":{"exerciseId":"full-exercise-id-here"},"message":"🗑️ Deleted cycling"}
Clarify: {"message":"Which exercise?"}
No entries: {"message":"No exercise logged today. What exercise did you do?"}`;
}
