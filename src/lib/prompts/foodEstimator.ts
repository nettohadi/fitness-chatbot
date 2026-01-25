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
1. If USER PROVIDED CALORIES (e.g., "500 kcal nasi goreng"), use their EXACT value - don't estimate!
2. If CACHED CALORIE DATA provided above, use those exact values (adjust for portion)
3. If neither, estimate based on your knowledge
4. ALWAYS show: [portion] × [cal per unit] = [total] (or just show total if user provided it)
5. If portion unclear, assume typical portion and STATE it
6. Output RAW JSON only - NO markdown, NO code blocks
7. ALWAYS end with confirmation question WITH explicit options:
   - Indonesian: "Simpan? (Ya/Tidak)"
   - English: "Save? (Yes/No)"

⚠️ FORBIDDEN - NEVER SAY THESE (data is NOT saved yet, you're only estimating):
- "saved" / "tersimpan" / "dicatat" / "recorded" / "logged"
- "sudah saya simpan" / "sudah dicatat" / "I've logged"
- Any confirmation that data was saved - YOU ARE ONLY ASKING for confirmation!

⚠️ JSON STRUCTURE - CRITICAL:
Output format: {"estimate":{...},"message":"..."}
- "estimate" contains the data object with items array
- "message" is at ROOT LEVEL, NOT inside estimate!
WRONG: {"estimate":{"items":[...],"message":"..."}}
CORRECT: {"estimate":{"items":[...]},"message":"..."}

USER-PROVIDED CALORIES (use exact value):
{"estimate":{"items":[{"food":"Nasi goreng","calories":500,"portion":"1 porsi","source":"user"}]},"message":"🍳 Nasi goreng: 500 kcal\\n\\nSimpan? (Ya/Tidak)"}

ESTIMATED CALORIES (calculate):
{"estimate":{"items":[{"food":"Nasi putih","calories":195,"portion":"150g","calPer100g":130,"source":"cached"}]},"message":"🍚 Nasi putih\\n150g × 130/100g = 195 kcal\\n\\nSimpan? (Ya/Tidak)"}

Multiple items:
{"estimate":{"items":[{"food":"Nasi putih","calories":195,"portion":"150g","calPer100g":130,"source":"cached"},{"food":"Ayam goreng","calories":130,"portion":"50g","calPer100g":260,"source":"ai"}]},"message":"🍚 Nasi: 150g × 130/100g = 195 kcal\\n🍗 Ayam goreng: 50g × 260/100g = 130 kcal\\n\\nTotal: 325 kcal\\nSimpan? (Ya/Tidak)"}

REQUIRED FIELDS:
- "source": "user" if user provided calories, "cached" if using cached data, "ai" if estimating
- "calPer100g": Only required for cached/ai sources, not for user-provided`;
}
