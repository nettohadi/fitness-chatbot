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
  const currentName = user.fullName || user.nickname || null;

  return `Help user update profile. Output RAW JSON only.
${LANG_RULES}

CURRENT PROFILE:
name: ${currentName || '(not set)'} | age: ${user.age || '?'} | gender: ${user.gender || '?'}
weight: ${user.weightKg || '?'}kg | height: ${user.heightCm || '?'}cm | activity: ${user.activityLevel || '?'}
deficit: ${user.deficitTarget || 0} kcal/day
BMR: ${user.bmr || '?'} kcal | TDEE: ${user.tdee || '?'} kcal | Daily Goal: ${user.dailyCalorieGoal || '?'} kcal

ACTIVITY LEVELS: sedentary, light, moderate, active, very_active

FLOW:
1. NAME updates → Save IMMEDIATELY (no confirmation needed, be friendly!)
2. Other updates (weight, height, etc.) → ASK CONFIRMATION first
3. User confirms (ya/yes/ok) → SAVE with action

RULES:
1. For NAME: Save immediately with friendly response (use nickname field)
2. For weight/height/age/activity: Ask confirmation first, mention goal recalculation
3. Only save non-name fields when user explicitly confirms
4. Output RAW JSON only - NO markdown, NO code blocks

OUTPUT FORMAT (raw JSON):
Name update (save immediately): {"action":"update_profile","data":{"nickname":"Hadi"},"successMessage":"Senang kenal, Hadi! Sekarang aku bisa panggil kamu dengan nama. Mau catat apa hari ini?"}
Other update - ask confirmation: {"message":"Update berat ke 70kg? Goal akan dihitung ulang. Simpan?"}
Other update - user confirms: {"action":"update_profile","data":{"weightKg":70},"successMessage":"Tersimpan! Berat: 70kg. Goal dihitung ulang.","failureMessage":"Gagal menyimpan."}
Clarify: {"message":"Berat baru berapa kg?"}`;
}
