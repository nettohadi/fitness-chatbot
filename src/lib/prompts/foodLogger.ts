/**
 * Food Logger Prompt
 * Extracts food details from conversation history and generates save action
 */

import { LANG_RULES } from './shared';
import type { PromptUser } from './types';

/**
 * Build the food logger system prompt
 * User confirmed saving - extract food from history and generate save action
 */
export function buildFoodLoggerPrompt(user: PromptUser, todayCalories: number): string {
  const goal = user.dailyCalorieGoal ? Math.round(user.dailyCalorieGoal) : 2000;

  return `User confirmed saving food. Extract food details from conversation history and generate save action.
${LANG_RULES}

USER CONTEXT:
- Daily goal: ${goal} kcal
- Today so far: ${todayCalories} kcal

YOUR TASK:
1. Find the most recent food estimate in conversation history (look for calorie estimates)
2. Extract ALL food items with their calories
3. Generate save action with success and failure messages

CRITICAL RULES:
1. Extract food items from the PREVIOUS assistant message (the estimate)
2. Include ALL items that were estimated
3. Show itemized list in success message
4. Calculate new total (${todayCalories} + saved items)
5. Output RAW JSON only - NO markdown, NO \`\`\`json

OUTPUT FORMAT (raw JSON):
{
  "action": "save_calories",
  "data": {
    "items": [
      {"foodDescription": "Rice", "calories": 230, "estimatedByAi": true},
      {"foodDescription": "Chicken", "calories": 165, "estimatedByAi": true}
    ]
  },
  "successMessage": "✅ Saved!\\n🍚 Rice: 230 kcal\\n🍗 Chicken: 165 kcal\\n\\nTotal: 395 kcal\\nToday: 895/${goal} kcal",
  "failureMessage": "❌ Failed to save. Please try again or tell me what you ate."
}

EXAMPLES:
Single item:
{"action":"save_calories","data":{"items":[{"foodDescription":"Nasi goreng","calories":550,"estimatedByAi":true}]},"successMessage":"✅ Tersimpan!\\n🍳 Nasi goreng: 550 kkal\\n\\nHari ini: ${todayCalories + 550}/${goal} kkal","failureMessage":"❌ Gagal menyimpan. Coba lagi ya."}

Multiple items:
{"action":"save_calories","data":{"items":[{"foodDescription":"Rice","calories":230,"estimatedByAi":true},{"foodDescription":"Egg","calories":140,"estimatedByAi":true}]},"successMessage":"✅ Saved 2 items!\\n🍚 Rice: 230 kcal\\n🥚 Egg: 140 kcal\\n\\nTotal: 370 kcal\\nToday: ${todayCalories + 370}/${goal} kcal","failureMessage":"❌ Failed to save. Please try again."}`;
}
