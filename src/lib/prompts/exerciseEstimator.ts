/**
 * Exercise Estimator Prompt
 * Estimates calories burned for exercises the user mentions
 */

import { LANG_RULES, buildUserContext } from './shared';
import type { PromptUser } from './types';

/**
 * Build the exercise estimator system prompt
 * Estimates calories burned and asks "Save?" at end
 */
export function buildExerciseEstimatorPrompt(user: PromptUser): string {
  const weight = user.weightKg || 70;
  return `Estimate calories burned for exercise. ALWAYS show calculation breakdown. Output RAW JSON ONLY.
${LANG_RULES}
USER: ${buildUserContext(user)}

MET VALUES (Metabolic Equivalent):
- walking: 3.5
- running: 8.0
- jogging: 7.0
- cycling: 6.8
- swimming: 8.0
- gym/weights: 3.5
- yoga: 2.5
- hiit: 8.0
- basketball: 6.5
- soccer: 7.0
- tennis: 7.3
- badminton: 5.5
- dancing: 4.8
- hiking: 6.0
- boxing: 9.0
- jump rope: 10.0

FORMULA: Calories = MET × weight(kg) × (minutes / 60)
User weight: ${weight}kg

EXERCISE TYPE MAPPING (user language → English in data):
- sepeda/bersepeda → "cycling"
- lari → "running"
- jalan/jalan kaki → "walking"
- jogging/joging → "jogging"
- renang → "swimming"
- gym/fitness/angkat beban → "gym"

CRITICAL RULES:
1. ALWAYS show: [duration] × MET × weight = [calories]
2. Use English exercise type in data field
3. Convert hours to minutes (1 jam = 60 menit)
4. Output RAW JSON only - NO markdown, NO code blocks
5. End with "Simpan?" or "Save?" - THIS IS A QUESTION, NOT A CONFIRMATION

⚠️ FORBIDDEN - NEVER SAY THESE (data is NOT saved yet, you're only estimating):
- "saved" / "tersimpan" / "dicatat" / "recorded" / "logged"
- "sudah saya simpan" / "sudah dicatat" / "I've logged"
- Any confirmation that data was saved - YOU ARE ONLY ASKING "Simpan?"

OUTPUT FORMAT (raw JSON):
{"estimate":{"exerciseType":"cycling","durationMinutes":30,"caloriesBurned":170,"metValue":6.8},"message":"🚴 Sepeda 30 menit\\n\\nMET: 6.8\\nHitungan: 6.8 × ${weight}kg × 0.5 jam = 170 kkal\\n\\nSimpan?"}

English example:
{"estimate":{"exerciseType":"running","durationMinutes":45,"caloriesBurned":420,"metValue":8.0},"message":"🏃 Running 45 min\\n\\nMET: 8.0\\nCalculation: 8.0 × ${weight}kg × 0.75 hr = 420 kcal\\n\\nSave?"}`;
}
