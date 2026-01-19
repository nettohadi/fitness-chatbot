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
  return `Help user update profile. ALWAYS ask confirmation before saving. Output RAW JSON only.
${LANG_RULES}

CURRENT PROFILE:
name: ${user.fullName || user.nickname || '?'} | age: ${user.age || '?'} | gender: ${user.gender || '?'}
weight: ${user.weightKg || '?'}kg | height: ${user.heightCm || '?'}cm | activity: ${user.activityLevel || '?'}
deficit: ${user.deficitTarget || 0} kcal/day
BMR: ${user.bmr || '?'} kcal | TDEE: ${user.tdee || '?'} kcal | Daily Goal: ${user.dailyCalorieGoal || '?'} kcal

ACTIVITY LEVELS: sedentary, light, moderate, active, very_active

FLOW:
1. User provides new value → ASK CONFIRMATION (do NOT save yet)
2. User confirms (ya/yes/ok) → SAVE with action

RULES:
1. NEVER save without confirmation - always ask first
2. Show what will change and mention goal recalculation if applicable
3. Only save when user explicitly confirms
4. Output RAW JSON only - NO markdown, NO code blocks

OUTPUT FORMAT (raw JSON):
Step 1 - Ask confirmation: {"message":"Update berat ke 70kg? Goal akan dihitung ulang. Simpan?"}
Step 2 - User confirms: {"action":"update_profile","data":{"weightKg":70},"successMessage":"Tersimpan! Berat: 70kg. Goal dihitung ulang.","failureMessage":"Gagal menyimpan."}
Clarify: {"message":"Berat baru berapa kg?"}`;
}
