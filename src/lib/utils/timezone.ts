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
 * Get today's calendar date in a specific timezone as a UTC Date object
 *
 * IMPORTANT: This returns midnight UTC of the calendar date in the user's timezone.
 * For example, if it's Jan 25 05:52 WIB (UTC+7), this returns:
 *   Date representing 2026-01-25T00:00:00.000Z (midnight UTC of Jan 25)
 *
 * This is used for storing the DATE field in the database, which should represent
 * the calendar date in the user's timezone, NOT the actual UTC time.
 *
 * @param timezone - IANA timezone string (e.g., 'Asia/Jakarta')
 * @returns Date object representing midnight UTC of the calendar date in user's timezone
 */
export function getLocalTodayAsDate(timezone: string): Date {
  const now = new Date();

  // Get today's date string in the user's timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayStr = formatter.format(now); // YYYY-MM-DD

  // Parse the date components and create midnight UTC for that calendar date
  // DO NOT add timezone offset - we want to store the calendar date, not the local midnight time
  const [year, month, day] = todayStr.split('-').map(Number);

  console.log(`[TIMEZONE] getLocalTodayAsDate: timezone=${timezone}, now=${now.toISOString()}, todayStr=${todayStr}`);

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
 * Get the UTC timestamp for local midnight in a specific timezone
 *
 * IMPORTANT: This is different from getLocalTodayAsDate!
 * - getLocalTodayAsDate: Returns midnight UTC of the calendar date (for DATE field storage)
 * - getLocalMidnightUTC: Returns the UTC time when it was midnight in the user's timezone
 *
 * Example for WIB (UTC+7) user at 05:34 WIB on Jan 26:
 * - getLocalTodayAsDate returns: 2026-01-26T00:00:00.000Z (midnight UTC, Jan 26)
 * - getLocalMidnightUTC returns: 2026-01-25T17:00:00.000Z (midnight WIB = 17:00 UTC, Jan 25)
 *
 * Use this function for filtering records by "today" in conversation history.
 *
 * @param timezone - IANA timezone string (e.g., 'Asia/Jakarta')
 * @returns Date object representing the UTC time when it was midnight in user's timezone
 */
export function getLocalMidnightUTC(timezone: string): Date {
  const now = new Date();

  // Get today's date string in the user's timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayStr = formatter.format(now); // YYYY-MM-DD

  // Parse the date components
  const [year, month, day] = todayStr.split('-').map(Number);

  // Get the offset in minutes for this timezone at this date
  const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const localFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  // Calculate offset by checking what time it is in the timezone when it's midnight UTC
  const parts = localFormatter.formatToParts(utcDate);
  const hourPart = parts.find(p => p.type === 'hour');
  const minutePart = parts.find(p => p.type === 'minute');
  const hourInTz = parseInt(hourPart?.value || '0', 10);
  const minInTz = parseInt(minutePart?.value || '0', 10);

  // If it's 7:00 in WIB when it's 00:00 UTC, offset is +7 hours
  // So local midnight (00:00 WIB) = 00:00 UTC - 7 hours = 17:00 UTC previous day
  const offsetMinutes = hourInTz * 60 + minInTz;

  // Subtract the offset to get UTC time of local midnight
  const localMidnightUTC = new Date(utcDate.getTime() - offsetMinutes * 60 * 1000);

  console.log(`[TIMEZONE] getLocalMidnightUTC: timezone=${timezone}, todayStr=${todayStr}, offsetMin=${offsetMinutes}, result=${localMidnightUTC.toISOString()}`);

  return localMidnightUTC;
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
