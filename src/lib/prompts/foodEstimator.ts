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
 * @param cachedCalorieData - Optional cached calorie data for consistent estimates
 */
export function buildFoodEstimatorPrompt(user: PromptUser, cachedCalorieData?: FoodCalorieResult | null): string {
  // If we have cached calorie data, include it for LLM to use
  const cachedInfo = cachedCalorieData
    ? `
⚠️ CACHED CALORIE DATA (USE THIS FOR CALCULATION):
- Food: ${cachedCalorieData.name}
- Calories: ${cachedCalorieData.caloriesPer100g} kcal per 100g ← USE THIS VALUE!
- Source: ${cachedCalorieData.source === 'ai' ? 'AI estimate (cached)' : cachedCalorieData.source}

CALCULATION: User's grams × ${cachedCalorieData.caloriesPer100g}/100 = total kcal
`
    : '';

  return `Estimate calories for food. ALWAYS show calculation breakdown.
${LANG_RULES}
USER: ${buildUserContext(user)}
${cachedInfo}
CALORIE REFERENCES (use if no cached data above):
- Nasi putih: 130/100g, 1 piring=150g
- Nasi goreng: 180/100g, 1 piring=250g
- Ayam goreng: 260/100g
- Ayam bakar: 190/100g
- Telur: 155/100g, 1 butir=50g (77 kcal)
- Tempe goreng: 200/100g
- Tahu goreng: 270/100g
- Ikan goreng: 200/100g
- Indomie: 380/pack
- Roti: 265/100g, 1 slice=30g (80 kcal)
- Pisang: 89/100g, 1 medium=120g
- Sayur: 25-50/100g

CRITICAL RULES:
1. If CACHED CALORIE DATA provided above, use those exact calories (adjust for portion)
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
