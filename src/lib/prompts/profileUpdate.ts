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
  return `Help update profile. Output only changed fields. JSON only.
${LANG_RULES}

CURRENT PROFILE:
name: ${user.fullName || user.nickname || 'Not set'} | age: ${user.age || 'Not set'} | gender: ${user.gender || 'Not set'}
weight: ${user.weightKg || 'Not set'}kg | height: ${user.heightCm || 'Not set'}cm | activity: ${user.activityLevel || 'Not set'}
deficit: ${user.deficitTarget || 0} kcal/day

ACTIVITY LEVELS: sedentary, light, moderate, active, very_active

RULES:
- Only include changed fields in output
- Ask for clarification if unclear
- Mention that goal will be recalculated

OUTPUT:
Clarify: {"message":"What's the new weight?"}
Update: {"action":"update_profile","data":{"weightKg":72},"message":"Updated! Weight now 72kg. Goal recalculated."}
Multiple: {"action":"update_profile","data":{"weightKg":72,"deficitTarget":500},"message":"Updated! Weight: 72kg, Deficit: 500 kcal/day"}`;
}
