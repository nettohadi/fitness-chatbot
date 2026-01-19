import prisma from '../prisma';
import type { CalorieEntry, DbResult, CalorieSummary } from '@/types';

/**
 * Add a new calorie entry
 * @param userId - User UUID
 * @param calories - Calorie amount
 * @param foodDescription - Description of the food (optional)
 * @param estimatedByAi - Whether calories were estimated by AI
 * @returns DbResult with created calorie entry or error
 */
export async function addCalorieEntry(
  userId: string,
  calories: number,
  foodDescription: string | null = null,
  estimatedByAi: boolean = false
): Promise<DbResult<CalorieEntry>> {
  try {
    const entry = await prisma.calorieEntry.create({
      data: {
        userId,
        calories,
        foodDescription,
        estimatedByAi,
      },
    });

    return { success: true, data: entry as unknown as CalorieEntry };
  } catch (error) {
    console.error('Error adding calorie entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get timezone offset in hours for a given timezone
 * @param timezone - IANA timezone string (e.g., "Asia/Jakarta")
 * @returns Offset in hours (e.g., +7 for Asia/Jakarta)
 */
function getTimezoneOffsetHours(timezone: string): number {
  const now = new Date();
  const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
}

/**
 * Get calorie entries for a specific date
 * @param userId - User UUID
 * @param date - Date in YYYY-MM-DD format (in user's timezone)
 * @param userTimezone - User's timezone (defaults to Asia/Jakarta)
 * @returns DbResult with array of calorie entries or error
 */
export async function getEntriesByDate(
  userId: string,
  date: string,
  userTimezone?: string | null
): Promise<DbResult<CalorieEntry[]>> {
  try {
    const timezone = userTimezone || process.env.APP_TIMEZONE || 'Asia/Jakarta';
    const [year, month, day] = date.split('-').map(Number);

    // Get timezone offset and calculate UTC boundaries for the user's local day
    // For example, if timezone is GMT+8 (Asia/Jakarta is GMT+7):
    // - "2026-01-19" local midnight = "2026-01-18T17:00:00Z" (for GMT+7)
    // - "2026-01-19" local 23:59:59 = "2026-01-19T16:59:59Z" (for GMT+7)
    const offsetHours = getTimezoneOffsetHours(timezone);

    // Create local midnight in the user's timezone, then convert to UTC
    const startOfDayLocal = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    startOfDayLocal.setUTCHours(startOfDayLocal.getUTCHours() - offsetHours);

    const endOfDayLocal = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    endOfDayLocal.setUTCHours(endOfDayLocal.getUTCHours() - offsetHours);

    console.log(`[DATE DEBUG] Querying date: ${date} (timezone: ${timezone}, offset: UTC${offsetHours >= 0 ? '+' : ''}${offsetHours})`);
    console.log(`[DATE DEBUG] startOfDay UTC: ${startOfDayLocal.toISOString()}`);
    console.log(`[DATE DEBUG] endOfDay UTC: ${endOfDayLocal.toISOString()}`);

    const entries = await prisma.calorieEntry.findMany({
      where: {
        userId,
        entryDate: {
          gte: startOfDayLocal,
          lte: endOfDayLocal,
        },
      },
      orderBy: {
        entryTime: 'desc',
      },
    });

    console.log(`[DATE DEBUG] Found ${entries.length} entries for date ${date}`);

    return { success: true, data: entries as unknown as CalorieEntry[] };
  } catch (error) {
    console.error('Error getting entries by date:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get calorie entries for a date range
 * @param userId - User UUID
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns DbResult with array of calorie entries or error
 */
export async function getEntriesByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<DbResult<CalorieEntry[]>> {
  try {
    const entries = await prisma.calorieEntry.findMany({
      where: {
        userId,
        entryDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: [
        { entryDate: 'desc' },
        { entryTime: 'desc' },
      ],
    });

    return { success: true, data: entries as unknown as CalorieEntry[] };
  } catch (error) {
    console.error('Error getting entries by date range:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get daily calorie summary for a specific date
 * @param userId - User UUID
 * @param date - Date in YYYY-MM-DD format
 * @returns DbResult with calorie summary or error
 */
export async function getDailySummary(
  userId: string,
  date: string
): Promise<DbResult<CalorieSummary>> {
  try {
    const entriesResult = await getEntriesByDate(userId, date);

    if (!entriesResult.success) {
      return {
        success: false,
        error: entriesResult.error,
      };
    }

    if (!entriesResult.data) {
      return {
        success: false,
        error: 'No data returned',
      };
    }

    const entries = entriesResult.data;
    const totalCalories = entries.reduce(
      (sum, entry) => sum + Number(entry.calories),
      0
    );

    return {
      success: true,
      data: {
        totalCalories,
        entryCount: entries.length,
        entries,
        startDate: date,
        endDate: date,
      },
    };
  } catch (error) {
    console.error('Error getting daily summary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get weekly calorie summary
 * @param userId - User UUID
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns DbResult with calorie summary or error
 */
export async function getWeeklySummary(
  userId: string,
  startDate: string,
  endDate: string
): Promise<DbResult<CalorieSummary>> {
  try {
    const entriesResult = await getEntriesByDateRange(userId, startDate, endDate);

    if (!entriesResult.success) {
      return {
        success: false,
        error: entriesResult.error,
      };
    }

    if (!entriesResult.data) {
      return {
        success: false,
        error: 'No data returned',
      };
    }

    const entries = entriesResult.data;
    const totalCalories = entries.reduce(
      (sum, entry) => sum + Number(entry.calories),
      0
    );

    return {
      success: true,
      data: {
        totalCalories,
        entryCount: entries.length,
        entries,
        startDate,
        endDate,
      },
    };
  } catch (error) {
    console.error('Error getting weekly summary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get today's date in YYYY-MM-DD format
 * @param userTimezone - Optional user timezone (e.g., "Asia/Jakarta", "America/New_York")
 * @returns Today's date string in the specified timezone
 */
export function getTodayDate(userTimezone?: string | null): string {
  const timezone = userTimezone || process.env.APP_TIMEZONE || 'Asia/Jakarta';
  const now = new Date();

  // Format date in the specified timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const todayDate = formatter.format(now);
  console.log(`[DATE] getTodayDate() = ${todayDate} (timezone: ${timezone})`);
  return todayDate;
}

/**
 * Get yesterday's date in YYYY-MM-DD format
 * @param userTimezone - Optional user timezone
 * @returns Yesterday's date string in the specified timezone
 */
export function getYesterdayDate(userTimezone?: string | null): string {
  const timezone = userTimezone || process.env.APP_TIMEZONE || 'Asia/Jakarta';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(yesterday);
}

/**
 * Get a date N days ago in YYYY-MM-DD format
 * @param daysAgo - Number of days ago
 * @param userTimezone - Optional user timezone
 * @returns Date string
 */
export function getDateDaysAgo(daysAgo: number, userTimezone?: string | null): string {
  const timezone = userTimezone || process.env.APP_TIMEZONE || 'Asia/Jakarta';
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(date);
}

/**
 * Get the date range for the current week (Monday to Sunday)
 * @param userTimezone - Optional user timezone
 * @returns Object with startDate and endDate in YYYY-MM-DD format
 */
export function getCurrentWeekRange(userTimezone?: string | null): { startDate: string; endDate: string } {
  const timezone = userTimezone || process.env.APP_TIMEZONE || 'Asia/Jakarta';
  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Get today in user's timezone
  const todayStr = formatter.format(now);
  const today = new Date(todayStr + 'T12:00:00');
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Calculate Monday of current week
  const monday = new Date(today);
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(today.getDate() + diff);

  // Calculate Sunday of current week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    startDate: monday.toISOString().split('T')[0],
    endDate: sunday.toISOString().split('T')[0],
  };
}

/**
 * Get the date range for the current month
 * @param userTimezone - Optional user timezone
 * @returns Object with startDate and endDate in YYYY-MM-DD format
 */
export function getCurrentMonthRange(userTimezone?: string | null): { startDate: string; endDate: string } {
  const timezone = userTimezone || process.env.APP_TIMEZONE || 'Asia/Jakarta';
  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Get today in user's timezone
  const todayStr = formatter.format(now);
  const today = new Date(todayStr + 'T12:00:00');

  // First day of current month
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  // Last day of current month
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return {
    startDate: firstDay.toISOString().split('T')[0],
    endDate: lastDay.toISOString().split('T')[0],
  };
}

/**
 * Get the date range for the last N days
 * @param days - Number of days to look back (default: 7)
 * @param userTimezone - Optional user timezone
 * @returns Object with startDate and endDate in YYYY-MM-DD format
 */
export function getLastNDaysRange(days: number = 7, userTimezone?: string | null): { startDate: string; endDate: string } {
  const timezone = userTimezone || process.env.APP_TIMEZONE || 'Asia/Jakarta';
  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const endDate = formatter.format(now);

  const startDateObj = new Date(now);
  startDateObj.setDate(now.getDate() - (days - 1));
  const startDate = formatter.format(startDateObj);

  return {
    startDate,
    endDate,
  };
}

/**
 * Parse a specific date string to YYYY-MM-DD format
 * Handles various formats like "2024-01-15", "January 15", "15 January", "tanggal 15 Januari"
 * @param dateStr - Date string from user input (already parsed by LLM)
 * @param userTimezone - Optional user timezone
 * @returns Date string in YYYY-MM-DD format, or null if parsing fails
 */
export function parseSpecificDate(dateStr: string, userTimezone?: string | null): string | null {
  const timezone = userTimezone || process.env.APP_TIMEZONE || 'Asia/Jakarta';

  // If already in YYYY-MM-DD format, validate and return
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parsed = new Date(dateStr + 'T12:00:00');
    if (!isNaN(parsed.getTime())) {
      return dateStr;
    }
  }

  // Month name mappings (English and Indonesian)
  const monthNames: { [key: string]: number } = {
    // English
    'january': 0, 'jan': 0,
    'february': 1, 'feb': 1,
    'march': 2, 'mar': 2,
    'april': 3, 'apr': 3,
    'may': 4,
    'june': 5, 'jun': 5,
    'july': 6, 'jul': 6,
    'august': 7, 'aug': 7,
    'september': 8, 'sep': 8, 'sept': 8,
    'october': 9, 'oct': 9,
    'november': 10, 'nov': 10,
    'december': 11, 'dec': 11,
    // Indonesian (only unique ones)
    'januari': 0,
    'februari': 1,
    'maret': 2,
    // 'april' same as English
    'mei': 4,
    'juni': 5,
    'juli': 6,
    'agustus': 7,
    // 'september' same as English
    'oktober': 9,
    // 'november' same as English
    'desember': 11,
  };

  const normalized = dateStr.toLowerCase().trim();

  // Try to extract day and month from various formats
  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;

  // Pattern: "15 January 2024" or "January 15 2024" or "15 Januari"
  for (const [monthName, monthIndex] of Object.entries(monthNames)) {
    if (normalized.includes(monthName)) {
      month = monthIndex;
      // Extract day number
      const dayMatch = normalized.match(/(\d{1,2})/);
      if (dayMatch) {
        day = parseInt(dayMatch[1], 10);
      }
      // Extract year if present
      const yearMatch = normalized.match(/(\d{4})/);
      if (yearMatch) {
        year = parseInt(yearMatch[1], 10);
      }
      break;
    }
  }

  // Pattern: "tanggal 15" (Indonesian for "date 15") - assume current month
  if (day === null && /tanggal\s*(\d{1,2})/i.test(normalized)) {
    const match = normalized.match(/tanggal\s*(\d{1,2})/i);
    if (match) {
      day = parseInt(match[1], 10);
    }
  }

  // If we have a day but no month, assume current month
  if (day !== null && month === null) {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
    });
    const [currentYear, currentMonth] = formatter.format(now).split('-').map(Number);
    month = currentMonth - 1; // 0-indexed
    year = year || currentYear;
  }

  // If we have day and month, construct the date
  if (day !== null && month !== null) {
    // Default to current year if not specified
    if (year === null) {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
      });
      year = parseInt(formatter.format(now), 10);

      // If the date is in the future, assume last year
      const testDate = new Date(year, month, day);
      const today = new Date();
      if (testDate > today) {
        year -= 1;
      }
    }

    // Validate the date
    const resultDate = new Date(year, month, day);
    if (resultDate.getMonth() === month && resultDate.getDate() === day) {
      const yyyy = resultDate.getFullYear();
      const mm = String(resultDate.getMonth() + 1).padStart(2, '0');
      const dd = String(resultDate.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  return null;
}

/**
 * Update an existing calorie entry
 *
 * @param entryId - Calorie entry ID
 * @param updates - Fields to update
 * @returns Updated calorie entry
 */
export async function updateCalorieEntry(
  entryId: string,
  updates: {
    calories?: number;
    foodDescription?: string;
    estimatedByAi?: boolean;
  }
): Promise<DbResult<CalorieEntry>> {
  try {
    const entry = await prisma.calorieEntry.update({
      where: { id: entryId },
      data: updates,
    });

    return { success: true, data: entry as unknown as CalorieEntry };
  } catch (error) {
    console.error('Error updating calorie entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a calorie entry
 *
 * @param entryId - Calorie entry ID
 * @returns Database operation result
 */
export async function deleteCalorieEntry(
  entryId: string
): Promise<DbResult<void>> {
  try {
    await prisma.calorieEntry.delete({
      where: { id: entryId },
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting calorie entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
