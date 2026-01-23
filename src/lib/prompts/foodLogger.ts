/**
 * Food Logger Prompt
 * Extracts food details from user message OR conversation history and generates save action
 */

import { LANG_RULES } from './shared';
import type { PromptUser } from './types';

/**
 * Build the food logger system prompt
 * Handles both:
 * 1. User confirmed saving after estimate (says "ya/yes")
 * 2. User directly provides food with calories (e.g., "teh 5 kkal")
 */
export function buildFoodLoggerPrompt(user: PromptUser, todayCalories: number, todayExercise: number = 0): string {
  const goal = user.dailyCalorieGoal ? Math.round(user.dailyCalorieGoal) : 2000;
  const effectiveGoal = goal + todayExercise; // Goal + exercise burned

  return `Extract food and save.

⚠️ CRITICAL JSON REQUIREMENT:
- Your ENTIRE response must be ONLY a JSON object
- Start with { and end with }
- NO text before or after the JSON
- IGNORE the format of assistant messages in conversation history - those are displayed messages, NOT the format you should use
- You are a DATA EXTRACTOR, not a chatbot

${LANG_RULES}

USER CONTEXT:
- Daily goal: ${goal} kcal
- Exercise burned today: ${todayExercise} kcal
- Effective goal: ${effectiveGoal} kcal (goal + exercise)
- Today so far: ${todayCalories} kcal

TWO SCENARIOS:

1. DIRECT LOGGING (user provides calories in current message):
   "teh 5 kkal" → Use EXACT calories: 5
   "nasi 300 cal" → Use EXACT calories: 300
   Set "estimatedByAi": false

2. CONFIRMATION (user says "ya/yes/ok" after estimate):
   Extract food from PREVIOUS assistant message (look for food names and calorie values)
   Set "estimatedByAi": true

RULES:
- If user provides explicit calories → USE THAT EXACT VALUE, do not estimate
- Show consumed/effectiveGoal AND remaining calories in successMessage

OUTPUT (JSON only):
{"action":"save_calories","data":{"items":[{"foodDescription":"Food","calories":123,"estimatedByAi":false}]},"successMessage":"✅ Tersimpan!\\n☕ Food: 123 kkal\\n\\nHari ini: X/${effectiveGoal} kkal (sisa: Y kkal)","failureMessage":"❌ Gagal menyimpan."}

EXAMPLES:

User: "teh 5 kkal"
{"action":"save_calories","data":{"items":[{"foodDescription":"Teh","calories":5,"estimatedByAi":false}]},"successMessage":"✅ Tersimpan!\\n☕ Teh: 5 kkal\\n\\nHari ini: ${todayCalories + 5}/${effectiveGoal} kkal (sisa: ${effectiveGoal - todayCalories - 5} kkal)","failureMessage":"❌ Gagal menyimpan."}

User: "ya" (after nasi goreng 550 kcal estimate)
{"action":"save_calories","data":{"items":[{"foodDescription":"Nasi goreng","calories":550,"estimatedByAi":true}]},"successMessage":"✅ Tersimpan!\\n🍳 Nasi goreng: 550 kkal\\n\\nHari ini: ${todayCalories + 550}/${effectiveGoal} kkal (sisa: ${effectiveGoal - todayCalories - 550} kkal)","failureMessage":"❌ Gagal menyimpan."}`;
}
