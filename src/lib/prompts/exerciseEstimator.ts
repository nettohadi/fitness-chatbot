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

  return `Calculate calories burned for exercise. Output RAW JSON ONLY.
${LANG_RULES}

USER: Weight ${weight}kg

MET VALUES:
walking/jalan=3.5, jogging=7.0, running/lari=8.0, cycling/sepeda=6.8, swimming/renang=8.0, gym=3.5, yoga=2.5, hiit=8.0

FORMULA: MET × ${weight}kg × (minutes ÷ 60) = calories

CRITICAL:
- Start response with { and end with }
- NO text before or after JSON
- NO explanations outside the JSON
- Put MET and calculation INSIDE the "message" field
- Use ENGLISH exercise type in data (cycling, running, walking)
- Translate exercise name in message (sepeda, lari, jalan)

OUTPUT (start with { immediately):
{"estimate":{"exerciseType":"cycling","durationMinutes":30,"caloriesBurned":${Math.round(6.8 * weight * 0.5)},"metValue":6.8},"message":"🚴 Sepeda 30 menit\\n\\nMET: 6.8\\nHitungan: 6.8 × ${weight}kg × 0.5 jam = ${Math.round(6.8 * weight * 0.5)} kkal\\n\\nSimpan?"}`;
}
