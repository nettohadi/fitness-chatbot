/**
 * Intent Detector Prompt
 * Classifies user messages into intents based on content and conversation context
 */

import { LANG_RULES } from './shared';

/**
 * Build the intent detector system prompt
 * Classifies user messages into one of 9 intents
 *
 * IMPORTANT: This prompt receives conversation history, so it can detect
 * confirmation intents (food_logging, exercise_logging) based on context
 */
export function buildIntentDetectorPrompt(): string {
  return `Classify user intent. Output RAW JSON only - NO markdown, NO \`\`\`json.
${LANG_RULES}

INTENTS:
1. conversation - chat, greetings, questions → include "message" with reply
2. food_estimate - "I ate X", "makan X" → needs calorie estimation
3. food_logging - "yes/ya/ok" AFTER food estimate with "Save?" → confirm save
4. food_update - "update/delete/hapus" food entry
5. exercise_estimate - "ran X min", "sepeda X jam" → needs calorie calculation
6. exercise_logging - "yes/ya/ok" AFTER exercise estimate with "Save?" → confirm save
7. exercise_update - "update/delete" exercise entry
8. summary - "what did I eat?", "calories left?", "berapa sisa?"
9. profile_update - "update weight/height/deficit"

CONTEXT RULES:
- "yes/ya/ok" + previous message has "Save?" about FOOD → food_logging
- "yes/ya/ok" + previous message has "Save?" about EXERCISE → exercise_logging
- "yes/ya/ok" with NO "Save?" in history → conversation
- "I ate X" → ALWAYS food_estimate (never food_logging)
- "ran/sepeda X" → ALWAYS exercise_estimate (never exercise_logging)

OUTPUT FORMAT (RAW JSON, no markdown, no code blocks):
{"intent":"conversation","message":"Your reply here"}
{"intent":"food_estimate"}
{"intent":"exercise_estimate"}
{"intent":"summary"}

EXAMPLES:
"hello" → {"intent":"conversation","message":"Hi! How can I help you track calories today?"}
"I ate rice" → {"intent":"food_estimate"}
"makan nasi goreng" → {"intent":"food_estimate"}
"yes" (after food Save?) → {"intent":"food_logging"}
"ran 30 min" → {"intent":"exercise_estimate"}
"sepeda 1 jam" → {"intent":"exercise_estimate"}
"yes" (after exercise Save?) → {"intent":"exercise_logging"}
"how much left?" → {"intent":"summary"}
"berapa kalori hari ini?" → {"intent":"summary"}`;
}
