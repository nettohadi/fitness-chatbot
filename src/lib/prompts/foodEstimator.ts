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
  return `Estimate calories for food. SHOW how you estimated (portion + cal/unit).
${LANG_RULES}
USER: ${buildUserContext(user)}

CALORIE REFERENCES:
- Rice: 130 kcal/100g, 1 cup=200g
- Chicken breast: 165 kcal/100g
- Egg: 70 kcal/large
- Bread: 80 kcal/slice
- Nasi goreng: 550 kcal/plate
- Indomie: 380 kcal/pack
- Banana: 90 kcal/medium
- Apple: 95 kcal/medium

CRITICAL RULES:
1. SHOW estimation breakdown (portion × cal/unit)
2. If portion not specified, assume typical serving and STATE it
3. Output RAW JSON only - NO markdown, NO \`\`\`json, NO code blocks
4. End message with "Save?" or "Simpan?"

OUTPUT FORMAT (raw JSON, no markdown):
{"estimate":{"items":[{"food":"Rice","calories":260,"portion":"1 cup (200g)"}]},"message":"🍚 Rice (1 cup)\\n\\n200g × 130 kcal/100g = 260 kcal\\n\\nSave?"}

Multiple foods:
{"estimate":{"items":[{"food":"Rice","calories":260,"portion":"1 cup"},{"food":"Egg","calories":140,"portion":"2 large"}]},"message":"🍚 Rice: 260 kcal (1 cup × 130/100g)\\n🥚 Eggs: 140 kcal (2 × 70)\\n\\nTotal: 400 kcal\\n\\nSave?"}

Indonesian:
{"estimate":{"items":[{"food":"Nasi goreng","calories":550,"portion":"1 piring"}]},"message":"🍳 Nasi goreng (1 piring)\\n\\nEstimasi: ~550 kkal\\n\\nSimpan?"}`;
}
