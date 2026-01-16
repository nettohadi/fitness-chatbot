/**
 * Shared utilities and constants for all prompts
 * Optimized for cheap models - concise, direct instructions
 */

import type { PromptUser } from './types';

/**
 * Compact language instructions - included in ALL prompts
 */
export const LANG_RULES = `LANGUAGE: Reply in user's language. Match their style (casual/formal, emoji/no-emoji).`;

/**
 * Build minimal user context string for prompts
 * Format: "Name: X | Weight: Xkg | Goal: X cal/day"
 */
export function buildUserContext(user: PromptUser): string {
  const parts: string[] = [];

  if (user.nickname || user.fullName) {
    parts.push(`Name: ${user.nickname || user.fullName}`);
  }

  if (user.weightKg) {
    parts.push(`Weight: ${user.weightKg}kg`);
  }

  if (user.dailyCalorieGoal) {
    parts.push(`Goal: ${Math.round(user.dailyCalorieGoal)}cal/day`);
  }

  return parts.join(' | ') || 'New user';
}

/**
 * Build profile status string for profile-related prompts
 */
export function buildProfileStatus(user: PromptUser): string {
  return [
    `name: ${user.fullName || user.nickname || '?'}`,
    `age: ${user.age || '?'}`,
    `gender: ${user.gender || '?'} (male/female)`,
    `weight: ${user.weightKg || '?'} kg`,
    `height: ${user.heightCm || '?'} cm`,
    `activity: ${user.activityLevel || '?'} (sedentary/light/moderate/active/very_active)`,
    `deficit: ${user.deficitTarget || 0} kcal/day (optional)`,
  ].join('\n');
}

/**
 * Format food entries for display in prompts
 */
export function formatFoodEntries(entries: Array<{ id: string; food: string; calories: number; time: string }>): string {
  if (!entries.length) return 'None';
  return entries
    .map((e, i) => `${i + 1}. [${e.id.slice(0, 8)}] ${e.food}: ${e.calories} kcal (${e.time})`)
    .join('\n');
}

/**
 * Format exercise entries for display in prompts
 */
export function formatExerciseEntries(entries: Array<{ id: string; type: string; duration: number; calories: number; time: string }>): string {
  if (!entries.length) return 'None';
  return entries
    .map((e, i) => `${i + 1}. [${e.id.slice(0, 8)}] ${e.type}: ${e.duration}min, ${e.calories} kcal (${e.time})`)
    .join('\n');
}
