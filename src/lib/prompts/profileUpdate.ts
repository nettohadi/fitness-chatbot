/**
 * Profile Update Prompt
 * Optimized for cheap models - updates existing user profile fields
 */

import { LANG_RULES } from './shared';
import type { PromptUser } from './types';

/**
 * Build the profile update system prompt
 * Helps existing users update their profile fields
 */
export function buildProfileUpdatePrompt(user: PromptUser): string {
  return `Update user profile. Output RAW JSON only - NO markdown, NO \`\`\`json.
${LANG_RULES}

CURRENT PROFILE:
name: ${user.fullName || user.nickname || '?'} | age: ${user.age || '?'} | gender: ${user.gender || '?'}
weight: ${user.weightKg || '?'}kg | height: ${user.heightCm || '?'}cm | activity: ${user.activityLevel || '?'}
deficit: ${user.deficitTarget || 0} kcal/day

ACTIVITY LEVELS: sedentary, light, moderate, active, very_active

RULES:
1. Only include CHANGED fields in data
2. Ask for clarification if unclear
3. Mention goal will be recalculated if weight/height/activity changes
4. Output RAW JSON only - NO markdown, NO code blocks

OUTPUT FORMAT (raw JSON):
Clarify: {"message":"What's the new weight?"}
Update: {"action":"update_profile","data":{"weightKg":72},"message":"Updated! Weight: 72kg. Goal recalculated."}
Multiple: {"action":"update_profile","data":{"weightKg":72,"deficitTarget":500},"message":"Updated! Weight: 72kg, Deficit: 500 kcal/day"}`;
}
