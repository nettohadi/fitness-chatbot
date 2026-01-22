/**
 * System Settings Service
 * Provides cached access to system settings from the database
 */

import { prisma } from '@/lib/prisma';

// In-memory cache for settings
let settingsCache: Record<string, string> = {};
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60000; // 1 minute cache

/**
 * Get all settings from cache or database
 */
async function loadSettings(): Promise<Record<string, string>> {
  const now = Date.now();

  // Return cached settings if still valid
  if (cacheTimestamp > 0 && now - cacheTimestamp < CACHE_TTL_MS) {
    return settingsCache;
  }

  try {
    const settings = await prisma.systemSetting.findMany();
    settingsCache = {};
    for (const setting of settings) {
      settingsCache[setting.key] = setting.value;
    }
    cacheTimestamp = now;
    return settingsCache;
  } catch (error) {
    console.error('[Settings] Failed to load settings:', error);
    // Return cached settings even if expired, or empty object
    return settingsCache;
  }
}

/**
 * Get a single setting by key
 */
export async function getSetting(key: string): Promise<string | null> {
  const settings = await loadSettings();
  return settings[key] || null;
}

/**
 * Get the model to use for food estimation
 * Returns the full model ID (e.g., 'google/gemini-2.5-flash' or 'openai/gpt-4o-mini')
 */
export async function getFoodEstimateModel(): Promise<string> {
  const settings = await loadSettings();
  const modelType = settings['food_estimate_model'] || 'gemini';

  if (modelType === 'gpt') {
    return settings['food_estimate_model_id_gpt'] || 'openai/gpt-4o-mini';
  }

  return settings['food_estimate_model_id_gemini'] || 'google/gemini-2.5-flash';
}

/**
 * Get the current food estimate model type ('gemini' or 'gpt')
 */
export async function getFoodEstimateModelType(): Promise<'gemini' | 'gpt'> {
  const settings = await loadSettings();
  const modelType = settings['food_estimate_model'];
  return modelType === 'gpt' ? 'gpt' : 'gemini';
}

/**
 * Clear the settings cache (useful after updates)
 */
export function clearSettingsCache(): void {
  cacheTimestamp = 0;
  settingsCache = {};
}
