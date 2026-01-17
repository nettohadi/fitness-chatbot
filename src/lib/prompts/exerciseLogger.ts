/**
 * Exercise Logger Prompt
 * Extracts exercise details from conversation history and generates save action
 */

import { LANG_RULES } from './shared';
import type { PromptUser } from './types';

/**
 * Build the exercise logger system prompt
 * User confirmed saving - extract exercise from history and generate save action
 */
export function buildExerciseLoggerPrompt(user: PromptUser, todayBurned: number): string {
  const weight = user.weightKg || 70;

  return `User confirmed saving exercise. Extract exercise details from conversation history and generate save action.
${LANG_RULES}

USER CONTEXT:
- Weight: ${weight} kg
- Today burned so far: ${todayBurned} kcal

YOUR TASK:
1. Find the most recent exercise estimate in conversation history (look for MET calculation)
2. Extract exercise type, duration, calories burned, and MET value
3. If MULTIPLE INTENSITIES/MET values exist, create MULTIPLE entries
4. Generate save action with success and failure messages

EXERCISE TRANSLATIONS (for successMessage - translate to user's language):
cycling = bersepeda/sepeda, running = lari, walking = jalan kaki, swimming = renang, gym = gym

CRITICAL RULES:
1. Extract exercise details from the PREVIOUS assistant message (the estimate)
2. Use ENGLISH exercise type in data object (cycling, running, walking, swimming, gym)
3. TRANSLATE exercise type in successMessage to user's language
4. Calculate new total (${todayBurned} + burned calories)
5. Output RAW JSON only - NO markdown, NO \`\`\`json
6. IMPORTANT: If exercise has DIFFERENT MET values/intensities, use "save_multiple_exercises" action

OUTPUT FORMAT - SINGLE EXERCISE (same intensity throughout):
{
  "action": "save_exercise",
  "data": {
    "exerciseType": "cycling",
    "durationMinutes": 30,
    "caloriesBurned": 255,
    "metValue": 6.8
  },
  "successMessage": "✅ Saved!\\n🚴 30 min cycling\\n🔥 255 kcal burned\\n\\nToday total: 455 kcal",
  "failureMessage": "❌ Failed to save. Please try again."
}

OUTPUT FORMAT - MULTIPLE INTENSITIES (different MET values):
{
  "action": "save_multiple_exercises",
  "data": {
    "entries": [
      {"exerciseType": "cycling", "durationMinutes": 30, "caloriesBurned": 225, "metValue": 6.0},
      {"exerciseType": "cycling", "durationMinutes": 10, "caloriesBurned": 88, "metValue": 7.0}
    ]
  },
  "successMessage": "✅ Saved 2 entries!\\n🚴 30 min level 6: 225 kcal\\n🚴 10 min level 7: 88 kcal\\nTotal: 313 kcal\\n\\nToday total: 513 kcal",
  "failureMessage": "❌ Failed to save. Please try again."
}

WHEN TO USE MULTIPLE ENTRIES:
- Different intensity levels (level 5, level 6, level 7)
- Different MET values in the estimate
- Mixed exercise types in one session

EXAMPLES:

Single intensity:
{"action":"save_exercise","data":{"exerciseType":"cycling","durationMinutes":30,"caloriesBurned":225,"metValue":6.0},"successMessage":"✅ Tersimpan!\\n🚴 30 menit sepeda\\n🔥 225 kkal terbakar\\n\\nTotal hari ini: ${todayBurned + 225} kkal","failureMessage":"❌ Gagal menyimpan."}

Multiple intensities (Level 6 + Level 7):
{"action":"save_multiple_exercises","data":{"entries":[{"exerciseType":"cycling","durationMinutes":30,"caloriesBurned":225,"metValue":6.0},{"exerciseType":"cycling","durationMinutes":10,"caloriesBurned":88,"metValue":7.0}]},"successMessage":"✅ Tersimpan 2 entri!\\n🚴 30 menit level 6: 225 kkal\\n🚴 10 menit level 7: 88 kkal\\nTotal: 313 kkal\\n\\nTotal hari ini: ${todayBurned + 313} kkal","failureMessage":"❌ Gagal menyimpan."}`;
}
