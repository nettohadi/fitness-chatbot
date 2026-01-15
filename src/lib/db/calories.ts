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
 * Get calorie entries for a specific date
 * @param userId - User UUID
 * @param date - Date in YYYY-MM-DD format
 * @returns DbResult with array of calorie entries or error
 */
export async function getEntriesByDate(
  userId: string,
  date: string
): Promise<DbResult<CalorieEntry[]>> {
  try {
    // Parse the date string and create start/end of day in UTC
    // This ensures consistent date comparison regardless of server timezone
    const [year, month, day] = date.split('-').map(Number);

    // Create dates at UTC midnight for the requested date
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    console.log(`[DATE DEBUG] Querying date: ${date}`);
    console.log(`[DATE DEBUG] startOfDay UTC: ${startOfDay.toISOString()}`);
    console.log(`[DATE DEBUG] endOfDay UTC: ${endOfDay.toISOString()}`);

    const entries = await prisma.calorieEntry.findMany({
      where: {
        userId,
        entryDate: {
          gte: startOfDay,
          lte: endOfDay,
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
 * Uses configured timezone (defaults to Asia/Jakarta for Indonesian users)
 * @returns Today's date string
 */
export function getTodayDate(): string {
  const timezone = process.env.APP_TIMEZONE || 'Asia/Jakarta';
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
 * Uses configured timezone (defaults to Asia/Jakarta for Indonesian users)
 * @returns Yesterday's date string
 */
export function getYesterdayDate(): string {
  const timezone = process.env.APP_TIMEZONE || 'Asia/Jakarta';
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
 * @returns Date string
 */
export function getDateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

/**
 * Get the date range for the current week (Monday to Sunday)
 * @returns Object with startDate and endDate in YYYY-MM-DD format
 */
export function getCurrentWeekRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Calculate Monday of current week
  const monday = new Date(now);
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days
  monday.setDate(now.getDate() + diff);

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
 * @returns Object with startDate and endDate in YYYY-MM-DD format
 */
export function getCurrentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();

  // First day of current month
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

  // Last day of current month
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    startDate: firstDay.toISOString().split('T')[0],
    endDate: lastDay.toISOString().split('T')[0],
  };
}

/**
 * Get the date range for the last N days
 * @param days - Number of days to look back (default: 7)
 * @returns Object with startDate and endDate in YYYY-MM-DD format
 */
export function getLastNDaysRange(days: number = 7): { startDate: string; endDate: string } {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - (days - 1));

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],
  };
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
