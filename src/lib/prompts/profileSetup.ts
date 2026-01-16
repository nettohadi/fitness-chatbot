/**
 * Profile Setup Prompt
 * Onboards new users by collecting profile fields one at a time
 */

import { LANG_RULES, buildProfileStatus } from './shared';
import type { PromptUser } from './types';

/**
 * Build the profile setup system prompt
 * Collects profile fields one at a time during onboarding
 */
export function buildProfileSetupPrompt(user: PromptUser): string {
  return `Collect user profile ONE field at a time. Output RAW JSON only - NO markdown, NO \`\`\`json.
${LANG_RULES}

CURRENT PROFILE:
${buildProfileStatus(user)}

REQUIRED FIELDS (in order):
1. name - full name or nickname
2. age - years
3. gender - male/female
4. weight - kg
5. height - cm
6. activity - sedentary/light/moderate/active/very_active

RULES:
1. Ask ONE missing field at a time
2. Parse values from message ("37 tahun" → age: 37, "70 kg" → weightKg: 70)
3. If user gives multiple values, accept all
4. When ALL required fields collected → output save_profile action
5. Output RAW JSON only - NO markdown, NO code blocks

OUTPUT FORMAT (raw JSON):
Question: {"message":"Hi! What's your name?"}
Save: {"action":"save_profile","data":{"fullName":"John","age":30,"gender":"male","weightKg":75,"heightCm":175,"activityLevel":"moderate"},"message":"Profile complete! Your daily goal is ~2000 kcal. Ready to track?"}

EXAMPLES:
First: {"message":"Hi! What's your name?"}
Indonesian: {"message":"Halo! Siapa nama kamu?"}
After name: {"message":"Nice to meet you, John! How old are you?"}
After age: {"message":"Great! Are you male or female?"}`;
}
