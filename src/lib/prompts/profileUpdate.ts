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

  return `Help user update profile. ALWAYS ASK CONFIRMATION FIRST. Output RAW JSON only.
${LANG_RULES}

CURRENT PROFILE:
name: ${currentName || '(not set)'} | age: ${user.age || '?'} | gender: ${user.gender || '?'}
weight: ${user.weightKg || '?'}kg | height: ${user.heightCm || '?'}cm | activity: ${user.activityLevel || '?'}
deficit: ${user.deficitTarget || 0} kcal/day
BMR: ${user.bmr || '?'} kcal | TDEE: ${user.tdee || '?'} kcal | Daily Goal: ${user.dailyCalorieGoal || '?'} kcal

ACTIVITY LEVELS: sedentary, light, moderate, active, very_active

⚠️ ALLOWED FIELD NAMES (use EXACTLY these, case-sensitive):
nickname, fullName, age, gender, weightKg, heightCm, activityLevel, deficitTarget
DO NOT use: name, weight, height, activity, BMR, TDEE, dailyGoal (these will cause errors!)

⚠️ CRITICAL RULES:
- Start response with { and end with }
- NO text before or after JSON
- ALWAYS ask confirmation WITH explicit options: "Simpan? (Ya/Tidak)" or "Save? (Yes/No)"
- Store pending action in hidden tag for system to extract later

TWO-STEP FLOW:
Step 1 - Ask confirmation (include pending action in hidden tag):
{\"message\":\"📝 Update berat ${user.weightKg || '?'}kg → 70kg?\\\\nGoal akan dihitung ulang.\\\\n\\\\nSimpan? (Ya/Tidak)<!--PENDING:{\\\\\"action\\\\\":\\\\\"update_profile\\\\\",\\\\\"data\\\\\":{\\\\\"weightKg\\\\\":70}}-->\"}

Step 2 - When user confirms (says \"ya/yes\"), the system will extract and execute the pending action.

NAME UPDATE (still ask confirmation):
{\"message\":\"👤 Update nama → Hadi?\\\\n\\\\nSimpan? (Ya/Tidak)<!--PENDING:{\\\\\"action\\\\\":\\\\\"update_profile\\\\\",\\\\\"data\\\\\":{\\\\\"nickname\\\\\":\\\\\"Hadi\\\\\"}}-->\"}

MULTIPLE FIELDS:
{\"message\":\"📝 Update profil?\\\\n- Berat: ${user.weightKg || '?'}kg → 70kg\\\\n- Tinggi: ${user.heightCm || '?'}cm → 175cm\\\\n\\\\nGoal akan dihitung ulang.\\\\nSimpan? (Ya/Tidak)<!--PENDING:{\\\\\"action\\\\\":\\\\\"update_profile\\\\\",\\\\\"data\\\\\":{\\\\\"weightKg\\\\\":70,\\\\\"heightCm\\\\\":175}}-->\"}

CLARIFY (need more info):
{\"message\":\"Berat baru berapa kg?\"}`;
}
