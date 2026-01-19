/**
 * Timezone utilities for per-user timezone support
 */

/**
 * Map of language codes to likely timezones
 * This is a best-effort mapping - users can update their timezone later
 */
const LANGUAGE_TO_TIMEZONE: Record<string, string> = {
  // Indonesian
  'id': 'Asia/Jakarta',       // GMT+7 (WIB)

  // Southeast Asia
  'ms': 'Asia/Kuala_Lumpur',  // GMT+8
  'th': 'Asia/Bangkok',       // GMT+7
  'vi': 'Asia/Ho_Chi_Minh',   // GMT+7
  'tl': 'Asia/Manila',        // GMT+8
  'fil': 'Asia/Manila',       // GMT+8

  // East Asia
  'zh': 'Asia/Shanghai',      // GMT+8
  'zh-CN': 'Asia/Shanghai',
  'zh-TW': 'Asia/Taipei',
  'ja': 'Asia/Tokyo',         // GMT+9
  'ko': 'Asia/Seoul',         // GMT+9

  // South Asia
  'hi': 'Asia/Kolkata',       // GMT+5:30
  'bn': 'Asia/Dhaka',         // GMT+6

  // Middle East
  'ar': 'Asia/Dubai',         // GMT+4
  'fa': 'Asia/Tehran',        // GMT+3:30
  'he': 'Asia/Jerusalem',     // GMT+2/3
  'tr': 'Europe/Istanbul',    // GMT+3

  // Europe
  'ru': 'Europe/Moscow',      // GMT+3
  'uk': 'Europe/Kiev',        // GMT+2/3
  'de': 'Europe/Berlin',      // GMT+1/2
  'fr': 'Europe/Paris',       // GMT+1/2
  'es': 'Europe/Madrid',      // GMT+1/2
  'it': 'Europe/Rome',        // GMT+1/2
  'pt': 'Europe/Lisbon',      // GMT+0/1
  'pt-BR': 'America/Sao_Paulo', // GMT-3
  'nl': 'Europe/Amsterdam',   // GMT+1/2
  'pl': 'Europe/Warsaw',      // GMT+1/2

  // English - default to UTC (could be anywhere)
  'en': 'UTC',
  'en-US': 'America/New_York',
  'en-GB': 'Europe/London',
  'en-AU': 'Australia/Sydney',

  // Americas
  'es-MX': 'America/Mexico_City',
  'es-AR': 'America/Buenos_Aires',
};

/**
 * Default timezone when we can't determine from language
 */
const DEFAULT_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Jakarta';

/**
 * Infer timezone from Telegram language_code
 * @param languageCode - Telegram user's language_code (e.g., 'en', 'id', 'zh-CN')
 * @returns IANA timezone string
 */
export function inferTimezoneFromLanguage(languageCode?: string): string {
  if (!languageCode) {
    return DEFAULT_TIMEZONE;
  }

  // Try exact match first
  if (LANGUAGE_TO_TIMEZONE[languageCode]) {
    return LANGUAGE_TO_TIMEZONE[languageCode];
  }

  // Try base language (e.g., 'zh' from 'zh-CN')
  const baseLanguage = languageCode.split('-')[0];
  if (LANGUAGE_TO_TIMEZONE[baseLanguage]) {
    return LANGUAGE_TO_TIMEZONE[baseLanguage];
  }

  return DEFAULT_TIMEZONE;
}

/**
 * Get today's date in a specific timezone as a Date object (for database storage)
 * @param timezone - IANA timezone string (e.g., 'Asia/Jakarta')
 * @returns Date object representing midnight UTC of the local date
 */
export function getLocalTodayAsDate(timezone: string): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayStr = formatter.format(now); // YYYY-MM-DD
  const [year, month, day] = todayStr.split('-').map(Number);
  // Create a Date at midnight UTC for this date
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Get today's date string in a specific timezone
 * @param timezone - IANA timezone string
 * @returns Date string in YYYY-MM-DD format
 */
export function getLocalTodayString(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

/**
 * Get user's timezone, falling back to app default
 * @param user - User object with optional timezone field
 * @returns IANA timezone string
 */
export function getUserTimezone(user?: { timezone?: string | null }): string {
  return user?.timezone || DEFAULT_TIMEZONE;
}

/**
 * Validate if a timezone string is valid
 * @param timezone - IANA timezone string to validate
 * @returns true if valid, false otherwise
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get current time in a specific timezone (formatted)
 * @param timezone - IANA timezone string
 * @returns Formatted time string
 */
export function getCurrentTimeInTimezone(timezone: string): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
