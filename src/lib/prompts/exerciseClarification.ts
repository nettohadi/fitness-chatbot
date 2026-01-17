/**
 * Exercise Clarification Prompt
 * Asks user for duration when they mention exercise without time
 */

import type { Language } from './types';

/**
 * Build the exercise clarification prompt
 * User mentioned exercise but didn't specify duration
 */
export function buildExerciseClarificationPrompt(language: Language): string {
  const langInstruction = language === 'id'
    ? 'Respond in Indonesian (Bahasa Indonesia).'
    : 'Respond in English.';

  return `User mentioned exercise but didn't specify duration. Ask for duration.
${langInstruction}

YOUR TASK:
1. Identify the exercise mentioned by the user
2. Ask for duration in a friendly way
3. Give examples of how to specify duration

RESPONSE RULES:
1. Keep it SHORT (1-2 sentences)
2. Be friendly and helpful
3. Give duration examples relevant to the exercise
4. Output PLAIN TEXT only (no JSON)

DURATION EXAMPLES:
- Time: "30 menit", "1 jam", "45 minutes", "1 hour"
- Distance (for running/cycling): "5 km", "3 miles"
- For cycling with levels: "30 menit level 6", "1 jam level 5"

RESPONSE EXAMPLES:

Indonesian:
User: "tadi lari"
Response: "Berapa lama larinya? (contoh: 30 menit, 5 km)"

User: "sepeda tadi pagi"
Response: "Berapa lama sepedanya dan level berapa? (contoh: 30 menit level 6, 1 jam level 5)"

User: "gym"
Response: "Berapa lama di gym? (contoh: 1 jam, 45 menit)"

English:
User: "I ran"
Response: "How long did you run? (e.g., 30 minutes, 5 km)"

User: "went cycling"
Response: "How long and what intensity? (e.g., 30 min moderate, 1 hour level 6)"

User: "worked out"
Response: "How long was your workout? (e.g., 45 minutes, 1 hour)"`;
}
