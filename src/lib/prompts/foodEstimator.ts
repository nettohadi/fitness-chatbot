/**
 * Food Estimator Prompt
 * Estimates calories for food the user mentions eating
 */

import { LANG_RULES, buildUserContext } from './shared';
import type { PromptUser } from './types';
import type { FoodCalorieResult } from '../services/foodCalorie';

/**
 * Build the food estimator system prompt
 * Estimates calories for food and asks "Save?"
 *
 * @param user - User profile data
 * @param cachedCalorieData - Optional array of cached calorie data for consistent estimates
 */
export function buildFoodEstimatorPrompt(user: PromptUser, cachedCalorieData?: FoodCalorieResult[] | null): string {
  // If we have cached calorie data, include it for LLM to use
  let cachedInfo = '';
  if (cachedCalorieData && cachedCalorieData.length > 0) {
    const cachedItems = cachedCalorieData
      .map((item) => `- ${item.name}: ${item.caloriesPer100g} kcal/100g`)
      .join('\n');
    cachedInfo = `
⚠️ CACHED CALORIE DATA (USE THESE FOR CALCULATION):
${cachedItems}

For foods listed above, use the EXACT cached values!
`;
  }

  return `Estimate calories for food. ALWAYS show calculation breakdown.
${LANG_RULES}
USER: ${buildUserContext(user)}
${cachedInfo}
CRITICAL RULES:
1. If CACHED CALORIE DATA provided above, use those exact values (adjust for portion)
2. ALWAYS show: [portion] × [cal per unit] = [total]
3. If portion unclear, assume typical portion and STATE it
4. Output RAW JSON only - NO markdown, NO code blocks
5. End with "Simpan?" or "Save?" - THIS IS A QUESTION, NOT A CONFIRMATION

⚠️ FORBIDDEN - NEVER SAY THESE (data is NOT saved yet, you're only estimating):
- "saved" / "tersimpan" / "dicatat" / "recorded" / "logged"
- "sudah saya simpan" / "sudah dicatat" / "I've logged"
- Any confirmation that data was saved - YOU ARE ONLY ASKING "Simpan?"

OUTPUT FORMAT (raw JSON):
{"estimate":{"items":[{"food":"Nasi putih","calories":195,"portion":"150g","calPer100g":130,"source":"cached"}]},"message":"🍚 Nasi putih\\n150g × 130/100g = 195 kcal\\n\\nSimpan?"}

Multiple:
{"estimate":{"items":[{"food":"Nasi putih","calories":195,"portion":"150g","calPer100g":130,"source":"cached"},{"food":"Ayam goreng","calories":130,"portion":"50g","calPer100g":260,"source":"ai"}]},"message":"🍚 Nasi: 150g × 130/100g = 195 kcal\\n🍗 Ayam goreng: 50g × 260/100g = 130 kcal\\n\\nTotal: 325 kcal\\nSimpan?"}

REQUIRED FIELDS:
- "calPer100g": The calories per 100g you used for calculation (REQUIRED!)
- "source": "cached" if using cached data, "source": "ai" if estimating`;
}
