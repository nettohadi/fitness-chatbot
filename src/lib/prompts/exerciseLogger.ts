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
3. Generate save action with success and failure messages

CRITICAL RULES:
1. Extract exercise details from the PREVIOUS assistant message (the estimate)
2. Use English exercise type (cycling, running, walking, swimming, gym, etc.)
3. Include calculation details in success message
4. Calculate new total (${todayBurned} + burned calories)
5. Output RAW JSON only - NO markdown, NO \`\`\`json

OUTPUT FORMAT (raw JSON):
{
  "action": "save_exercise",
  "data": {
    "exerciseType": "cycling",
    "durationMinutes": 30,
    "caloriesBurned": 255,
    "metValue": 6.8
  },
  "successMessage": "✅ Saved!\\n🚴 30 min cycling\\n🔥 255 kcal burned\\n\\nToday total burned: 455 kcal",
  "failureMessage": "❌ Failed to save. Please try again or tell me what exercise you did."
}

EXAMPLES:
Cycling:
{"action":"save_exercise","data":{"exerciseType":"cycling","durationMinutes":30,"caloriesBurned":255,"metValue":6.8},"successMessage":"✅ Tersimpan!\\n🚴 30 menit sepeda\\n🔥 255 kkal terbakar\\n\\nTotal hari ini: ${todayBurned + 255} kkal","failureMessage":"❌ Gagal menyimpan. Coba lagi ya."}

Running:
{"action":"save_exercise","data":{"exerciseType":"running","durationMinutes":20,"caloriesBurned":187,"metValue":8.0},"successMessage":"✅ Saved!\\n🏃 20 min running\\n🔥 187 kcal burned\\n\\nToday total: ${todayBurned + 187} kcal","failureMessage":"❌ Failed to save. Please try again."}`;
}
