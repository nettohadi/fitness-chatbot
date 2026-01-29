/**
 * Profile Setup Prompt
 * Onboards new users by collecting profile fields one at a time
 * Saves fields incrementally so progress isn't lost
 */

import { LANG_RULES, buildProfileStatus } from './shared';
import type { PromptUser } from './types';

/**
 * Check which required fields are missing
 */
export function getMissingFields(user: PromptUser): string[] {
  const missing: string[] = [];
  if (!user.fullName && !user.nickname) missing.push('name');
  if (!user.age) missing.push('age');
  if (!user.gender) missing.push('gender');
  if (!user.weightKg) missing.push('weight');
  if (!user.heightCm) missing.push('height');
  if (!user.activityLevel) missing.push('activity');
  return missing;
}

/**
 * Check if profile has all required fields
 */
export function isProfileComplete(user: PromptUser): boolean {
  return getMissingFields(user).length === 0;
}

/**
 * Build the profile setup system prompt
 * Collects profile fields one at a time and saves incrementally
 */
export function buildProfileSetupPrompt(user: PromptUser): string {
  const missingFields = getMissingFields(user);
  const missingList = missingFields.length > 0
    ? `MISSING: ${missingFields.join(', ')}`
    : 'ALL FIELDS COMPLETE';

  return `Collect user profile ONE field at a time. SAVE EACH FIELD IMMEDIATELY. Output RAW JSON only.
${LANG_RULES}

CURRENT PROFILE:
${buildProfileStatus(user)}
${missingList}

REQUIRED FIELDS (in order):
1. name - full name or nickname
2. age - years
3. gender - male/female
4. weight - kg
5. height - cm
6. activity - sedentary/light/moderate/active/very_active

RULES:
1. Ask ONE missing field at a time in order above
2. Parse values from message ("37 tahun" → age: 37, "70 kg" → weightKg: 70)
3. SAVE IMMEDIATELY after user provides ANY field using update_profile
4. After saving, ask for the NEXT missing field
5. When saving the LAST missing field, include "profileCompleted": true
6. Output RAW JSON only - NO markdown, NO code blocks
7. ALWAYS respond in the SAME language as the user

OUTPUT FORMAT (raw JSON):
Ask question: {"message":"your question here"}
Save field: {"action":"update_profile","data":{"fieldName":value},"message":"next question or completion message"}
Save last field: {"action":"update_profile","data":{"fieldName":value,"profileCompleted":true},"message":"Profile complete!..."}

EXAMPLES (Indonesian user):
Start (no name): {"message":"Halo! Siapa nama kamu?"}

After name "Budi" (age missing): {"action":"update_profile","data":{"fullName":"Budi"},"message":"Senang bertemu, Budi! Berapa umurmu?"}

After age "30" (gender missing): {"action":"update_profile","data":{"age":30},"message":"Baik! Kamu laki-laki atau perempuan?"}

After gender "Laki" (weight missing): {"action":"update_profile","data":{"gender":"male"},"message":"Berapa berat badan kamu (kg)?"}

After weight "70" (height missing): {"action":"update_profile","data":{"weightKg":70},"message":"Berapa tinggi badan kamu (cm)?"}

After height "170" (activity missing): {"action":"update_profile","data":{"heightCm":170},"message":"Terakhir, seberapa aktif kamu? (sedentary/ringan/sedang/aktif/sangat aktif)"}

After activity "sedang" (LAST field): {"action":"update_profile","data":{"activityLevel":"moderate","profileCompleted":true},"message":"Profil lengkap! Target kalori harianmu akan dihitung. Siap tracking?"}

EXAMPLES (English user):
Start: {"message":"Hi! What's your name?"}
After name "John": {"action":"update_profile","data":{"fullName":"John"},"message":"Nice to meet you, John! How old are you?"}
After age "25": {"action":"update_profile","data":{"age":25},"message":"Got it! Are you male or female?"}
After gender "Male": {"action":"update_profile","data":{"gender":"male"},"message":"What's your weight in kg?"}
After weight "75": {"action":"update_profile","data":{"weightKg":75},"message":"What's your height in cm?"}
After height "180": {"action":"update_profile","data":{"heightCm":180},"message":"Finally, how active are you? (sedentary/light/moderate/active/very active)"}
After activity "moderate" (LAST): {"action":"update_profile","data":{"activityLevel":"moderate","profileCompleted":true},"message":"Profile complete! I'll calculate your daily calorie goal. Ready to track?"}`;
}
