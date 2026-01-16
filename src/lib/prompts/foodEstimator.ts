/**
 * Food Estimator Prompt
 * Estimates calories for food the user mentions eating
 */

import { LANG_RULES, buildUserContext } from './shared';
import type { PromptUser } from './types';

/**
 * Build the food estimator system prompt
 * Estimates calories for food and asks "Save?"
 */
export function buildFoodEstimatorPrompt(user: PromptUser): string {
  return `Estimate calories for food. ALWAYS show calculation breakdown.
${LANG_RULES}
USER: ${buildUserContext(user)}

CALORIE REFERENCES (kcal/100g or per unit):
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
1. ALWAYS show: [portion] × [cal per unit] = [total]
2. If portion unclear, assume typical portion and STATE it
3. Show calories per 100g or per unit in breakdown
4. Output RAW JSON only - NO markdown, NO code blocks
5. End with "Simpan?" or "Save?"

OUTPUT FORMAT (raw JSON):
{"estimate":{"items":[{"food":"Nasi putih","calories":195,"portion":"1 piring (150g)"}]},"message":"🍚 Nasi putih\\n150g × 130 kcal/100g = 195 kcal\\n\\nSimpan?"}

Multiple:
{"estimate":{"items":[{"food":"Nasi putih","calories":195,"portion":"1 piring"},{"food":"Ayam goreng","calories":130,"portion":"1 potong (50g)"}]},"message":"🍚 Nasi: 150g × 130/100g = 195 kcal\\n🍗 Ayam goreng: 50g × 260/100g = 130 kcal\\n\\nTotal: 325 kcal\\nSimpan?"}

English:
{"estimate":{"items":[{"food":"Rice","calories":260,"portion":"1 cup (200g)"}]},"message":"🍚 Rice\\n200g × 130 kcal/100g = 260 kcal\\n\\nSave?"}`;
}
