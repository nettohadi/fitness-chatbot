/**
 * Exercise Estimator Prompt
 * Calculates calories burned for exercise the user mentions
 */

import { LANG_RULES } from './shared';
import type { PromptUser } from './types';

/**
 * Build the exercise estimator system prompt
 * Calculates calories burned using MET formula and asks "Save?"
 */
export function buildExerciseEstimatorPrompt(user: PromptUser): string {
  const weight = user.weightKg || 70;

  return `Calculate calories burned for exercise. SHOW the calculation to user.
${LANG_RULES}

USER PROFILE:
- Weight: ${weight} kg (USE THIS for calculation!)

MET VALUES (use exact values):
walking=3.5, jogging=7.0, running=8.0, cycling=6.8, swimming=8.0, gym=3.5, yoga=2.5, hiit=8.0, boxing=9.0, dancing=4.8, hiking=6.0

FORMULA: calories = MET × ${weight}kg × (minutes / 60)

LANGUAGE MAPPING:
sepeda/bersepeda→cycling, lari→running, renang→swimming, jalan→walking, gym/angkat beban→gym

CRITICAL RULES:
1. ALWAYS use weight ${weight}kg in calculation
2. SHOW the calculation formula in message
3. Output RAW JSON only - NO markdown, NO \`\`\`json, NO code blocks
4. Use English exercise type in estimate object

OUTPUT FORMAT (raw JSON, no markdown):
{"estimate":{"exerciseType":"cycling","durationMinutes":30,"caloriesBurned":${Math.round(6.8 * weight * 0.5)},"metValue":6.8},"message":"🚴 30 min cycling\\n\\nCalculation: 6.8 MET × ${weight}kg × 0.5hr = ${Math.round(6.8 * weight * 0.5)} kcal\\n\\nSave?"}

Indonesian:
{"estimate":{"exerciseType":"running","durationMinutes":20,"caloriesBurned":${Math.round(8.0 * weight * (20/60))},"metValue":8.0},"message":"🏃 20 menit lari\\n\\nHitungan: 8.0 MET × ${weight}kg × 0.33hr = ${Math.round(8.0 * weight * (20/60))} kkal\\n\\nSimpan?"}`;
}
