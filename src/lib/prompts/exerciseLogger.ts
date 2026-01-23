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

⚠️ CRITICAL JSON REQUIREMENT:
- Your ENTIRE response must be ONLY a JSON object
- Start with { and end with }
- NO text before or after the JSON
- IGNORE the format of assistant messages in conversation history - those are displayed messages, NOT the format you should use
- You are a DATA EXTRACTOR, not a chatbot

${LANG_RULES}

USER CONTEXT:
- Weight: ${weight} kg
- Today burned so far: ${todayBurned} kcal

YOUR TASK:
1. Find the exercise details from conversation history (look for exercise type, duration, calories)
2. Check if user EXPLICITLY provided calories burned (e.g., "lari 30 menit 300 kcal")
3. If user provided calories, use their value and set userProvidedCalories: true
4. If no user-provided calories, use the estimated value from previous message
5. Generate save action with success and failure messages

EXERCISE TRANSLATIONS (for successMessage - translate to user's language):
cycling = bersepeda/sepeda, running = lari, walking = jalan kaki, swimming = renang, gym = gym

RULES:
1. If user provided calories explicitly: set "userProvidedCalories": true and use their value
2. If calories were estimated by system: set "userProvidedCalories": false
3. Use ENGLISH exercise type in data object (cycling, running, walking, swimming, gym)
4. TRANSLATE exercise type in successMessage to user's language
5. Calculate new total (${todayBurned} + burned calories)
6. IMPORTANT: If exercise has DIFFERENT MET values/intensities, use "save_multiple_exercises" action

OUTPUT FORMAT - USER PROVIDED CALORIES:
{
  "action": "save_exercise",
  "data": {
    "exerciseType": "running",
    "durationMinutes": 30,
    "caloriesBurned": 300,
    "userProvidedCalories": true
  },
  "successMessage": "✅ Saved!\\n🏃 30 min running\\n🔥 300 kcal burned\\n\\nToday total: ${todayBurned + 300} kcal",
  "failureMessage": "❌ Failed to save. Please try again."
}

OUTPUT FORMAT - ESTIMATED CALORIES (single exercise):
{
  "action": "save_exercise",
  "data": {
    "exerciseType": "cycling",
    "durationMinutes": 30,
    "caloriesBurned": 255,
    "metValue": 6.8,
    "userProvidedCalories": false
  },
  "successMessage": "✅ Saved!\\n🚴 30 min cycling\\n🔥 255 kcal burned\\n\\nToday total: ${todayBurned + 255} kcal",
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
  "successMessage": "✅ Saved 2 entries!\\n🚴 30 min level 6: 225 kcal\\n🚴 10 min level 7: 88 kcal\\nTotal: 313 kcal\\n\\nToday total: ${todayBurned + 313} kcal",
  "failureMessage": "❌ Failed to save. Please try again."
}

WHEN TO USE MULTIPLE ENTRIES:
- Different intensity levels (level 5, level 6, level 7)
- Different MET values in the estimate
- Mixed exercise types in one session

EXAMPLES:

User provided calories ("lari 30 menit 300 kcal"):
{"action":"save_exercise","data":{"exerciseType":"running","durationMinutes":30,"caloriesBurned":300,"userProvidedCalories":true},"successMessage":"✅ Tersimpan!\\n🏃 30 menit lari\\n🔥 300 kkal terbakar\\n\\nTotal hari ini: ${todayBurned + 300} kkal","failureMessage":"❌ Gagal menyimpan."}

Estimated calories (no user-provided value):
{"action":"save_exercise","data":{"exerciseType":"cycling","durationMinutes":30,"caloriesBurned":225,"metValue":6.0,"userProvidedCalories":false},"successMessage":"✅ Tersimpan!\\n🚴 30 menit sepeda\\n🔥 225 kkal terbakar\\n\\nTotal hari ini: ${todayBurned + 225} kkal","failureMessage":"❌ Gagal menyimpan."}`;
}
