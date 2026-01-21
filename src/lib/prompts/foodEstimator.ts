/**
 * Food Estimator Prompt
 * Estimates calories for food the user mentions eating
 */

import { LANG_RULES, buildUserContext } from './shared';
import type { PromptUser } from './types';
import type { FoodResult } from '../services/fatSecret';

/**
 * Build the food estimator system prompt
 * Estimates calories for food and asks "Save?"
 *
 * @param user - User profile data
 * @param fatSecretData - Optional FatSecret lookup result for consistent calories
 */
export function buildFoodEstimatorPrompt(user: PromptUser, fatSecretData?: FoodResult | null): string {
  // If we have FatSecret data, include it for LLM to use
  // Prefer caloriesPer100g for easier calculation
  const fatSecretInfo = fatSecretData
    ? `
⚠️ FATSECRET DATA (USE THIS FOR CALCULATION):
- Food: ${fatSecretData.name}
${fatSecretData.caloriesPer100g ? `- Calories: ${fatSecretData.caloriesPer100g} kcal per 100g ← USE THIS FOR CALCULATION!` : `- Calories: ${fatSecretData.calories} kcal per ${fatSecretData.serving}`}
- Source: FatSecret database (reliable!)

CALCULATION:
${fatSecretData.caloriesPer100g ? `User's grams × ${fatSecretData.caloriesPer100g}/100 = total kcal` : `User's portion ÷ ${fatSecretData.serving} × ${fatSecretData.calories} = total kcal`}

Example: User says "200g nasi goreng" → 200 × ${fatSecretData.caloriesPer100g || 165}/100 = ${Math.round(200 * (fatSecretData.caloriesPer100g || 165) / 100)} kcal
`
    : '';

  return `Estimate calories for food. ALWAYS show calculation breakdown.
${LANG_RULES}
USER: ${buildUserContext(user)}
${fatSecretInfo}
CALORIE REFERENCES (use if no FatSecret data above):
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
1. If FATSECRET DATA provided above, use those exact calories (adjust for portion)
2. ALWAYS show: [portion] × [cal per unit] = [total]
3. If portion unclear, assume typical portion and STATE it
4. Output RAW JSON only - NO markdown, NO code blocks
5. End with "Simpan?" or "Save?" - THIS IS A QUESTION, NOT A CONFIRMATION

⚠️ FORBIDDEN - NEVER SAY THESE (data is NOT saved yet, you're only estimating):
- "saved" / "tersimpan" / "dicatat" / "recorded" / "logged"
- "sudah saya simpan" / "sudah dicatat" / "I've logged"
- Any confirmation that data was saved - YOU ARE ONLY ASKING "Simpan?"

OUTPUT FORMAT (raw JSON):
{"estimate":{"items":[{"food":"Nasi putih","calories":195,"portion":"1 piring (150g)","source":"fatsecret"}]},"message":"🍚 Nasi putih\\n150g × 130 kcal/100g = 195 kcal\\n\\nSimpan?"}

Multiple:
{"estimate":{"items":[{"food":"Nasi putih","calories":195,"portion":"1 piring","source":"fatsecret"},{"food":"Ayam goreng","calories":130,"portion":"1 potong (50g)","source":"ai"}]},"message":"🍚 Nasi: 150g × 130/100g = 195 kcal\\n🍗 Ayam goreng: 50g × 260/100g = 130 kcal\\n\\nTotal: 325 kcal\\nSimpan?"}

NOTE: Include "source":"fatsecret" if using FatSecret data, "source":"ai" if estimating yourself.`;
}
