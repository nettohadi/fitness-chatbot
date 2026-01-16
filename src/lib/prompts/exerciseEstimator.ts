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

  return `Calculate calories burned. ALWAYS show MET value and calculation.
${LANG_RULES}

USER: Weight ${weight}kg

MET VALUES:
walking/jalan=3.5, jogging=7.0, running/lari=8.0, cycling/sepeda=6.8, swimming/renang=8.0, gym=3.5, yoga=2.5, hiit=8.0

FORMULA: MET × ${weight}kg × (minutes ÷ 60) = calories

CRITICAL RULES:
1. ALWAYS show MET value for the exercise
2. ALWAYS show full calculation: MET × weight × time
3. Use weight ${weight}kg (from user profile)
4. Output RAW JSON only - NO markdown, NO code blocks
5. Use ENGLISH exercise type in data, translate in message

OUTPUT FORMAT (raw JSON):
{"estimate":{"exerciseType":"cycling","durationMinutes":30,"caloriesBurned":${Math.round(6.8 * weight * 0.5)},"metValue":6.8},"message":"🚴 Sepeda 30 menit\\n\\nMET: 6.8\\nHitungan: 6.8 × ${weight}kg × 0.5 jam = ${Math.round(6.8 * weight * 0.5)} kcal\\n\\nSimpan?"}

{"estimate":{"exerciseType":"running","durationMinutes":20,"caloriesBurned":${Math.round(8.0 * weight * (20/60))},"metValue":8.0},"message":"🏃 Lari 20 menit\\n\\nMET: 8.0\\nHitungan: 8.0 × ${weight}kg × 0.33 jam = ${Math.round(8.0 * weight * (20/60))} kcal\\n\\nSimpan?"}

English:
{"estimate":{"exerciseType":"walking","durationMinutes":45,"caloriesBurned":${Math.round(3.5 * weight * 0.75)},"metValue":3.5},"message":"🚶 Walking 45 min\\n\\nMET: 3.5\\nCalc: 3.5 × ${weight}kg × 0.75hr = ${Math.round(3.5 * weight * 0.75)} kcal\\n\\nSave?"}`;
}
