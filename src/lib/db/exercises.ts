import { prisma } from '@/lib/prisma';
import type { DbResult } from '@/types';
import type { ExerciseEntry } from '@prisma/client';

/**
 * Add an exercise entry to the database
 *
 * @param userId - User ID
 * @param exerciseType - Type of exercise
 * @param durationMinutes - Duration in minutes
 * @param caloriesBurned - Calories burned
 * @param metValue - MET value used for calculation (optional)
 * @returns Database operation result
 */
export async function addExerciseEntry(
  userId: string,
  exerciseType: string,
  durationMinutes: number,
  caloriesBurned: number,
  metValue?: number
): Promise<DbResult<ExerciseEntry>> {
  try {
    const entry = await prisma.exerciseEntry.create({
      data: {
        userId,
        exerciseType,
        durationMinutes,
        caloriesBurned,
        metValue,
      },
    });

    return { success: true, data: entry };
  } catch (error) {
    console.error('Error adding exercise entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get today's date in YYYY-MM-DD format using configured timezone
 * @param userTimezone - Optional user timezone
 * @returns Today's date string
 */
function getExerciseTodayDate(userTimezone?: string | null): string {
  const timezone = userTimezone || process.env.APP_TIMEZONE || 'Asia/Jakarta';
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
 * Get total calories burned from exercise today
 *
 * @param userId - User ID
 * @param userTimezone - Optional user timezone
 * @returns Total calories burned today
 */
export async function getTodayExerciseCalories(
  userId: string,
  userTimezone?: string | null
): Promise<DbResult<number>> {
  try {
    const today = getExerciseTodayDate(userTimezone);

    // Parse the date string and create start/end of day in UTC
    const [year, month, day] = today.split('-').map(Number);
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    const result = await prisma.exerciseEntry.aggregate({
      where: {
        userId,
        entryDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      _sum: {
        caloriesBurned: true,
      },
    });

    return {
      success: true,
      data: result._sum.caloriesBurned?.toNumber() || 0,
    };
  } catch (error) {
    console.error('Error getting exercise calories:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get today's exercise entries
 *
 * @param userId - User ID
 * @param userTimezone - Optional user timezone
 * @returns Array of exercise entries
 */
export async function getTodayExercises(
  userId: string,
  userTimezone?: string | null
): Promise<DbResult<ExerciseEntry[]>> {
  try {
    const today = getExerciseTodayDate(userTimezone);

    // Parse the date string and create start/end of day in UTC
    const [year, month, day] = today.split('-').map(Number);
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    console.log(`[EXERCISE DATE DEBUG] Querying date: ${today}`);
    console.log(`[EXERCISE DATE DEBUG] startOfDay UTC: ${startOfDay.toISOString()}`);
    console.log(`[EXERCISE DATE DEBUG] endOfDay UTC: ${endOfDay.toISOString()}`);

    const exercises = await prisma.exerciseEntry.findMany({
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

    console.log(`[EXERCISE DATE DEBUG] Found ${exercises.length} exercises for date ${today}`);

    return { success: true, data: exercises };
  } catch (error) {
    console.error('Error getting exercises:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get weekly exercise summary
 *
 * @param userId - User ID
 * @returns Total calories burned this week
 */
export async function getWeeklyExerciseSummary(
  userId: string
): Promise<DbResult<{ totalCalories: number; exerciseCount: number }>> {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    const result = await prisma.exerciseEntry.aggregate({
      where: {
        userId,
        entryDate: {
          gte: sevenDaysAgo,
          lte: today,
        },
      },
      _sum: {
        caloriesBurned: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      success: true,
      data: {
        totalCalories: result._sum.caloriesBurned?.toNumber() || 0,
        exerciseCount: result._count.id,
      },
    };
  } catch (error) {
    console.error('Error getting weekly exercise summary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get exercise history for a specific date range
 *
 * @param userId - User ID
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Array of exercise entries
 */
export async function getExerciseHistory(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<DbResult<ExerciseEntry[]>> {
  try {
    const exercises = await prisma.exerciseEntry.findMany({
      where: {
        userId,
        entryDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        entryDate: 'desc',
      },
    });

    return { success: true, data: exercises };
  } catch (error) {
    console.error('Error getting exercise history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get exercises by date range (string version)
 *
 * @param userId - User ID
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Array of exercise entries
 */
export async function getExercisesByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<DbResult<ExerciseEntry[]>> {
  try {
    const exercises = await prisma.exerciseEntry.findMany({
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

    return { success: true, data: exercises };
  } catch (error) {
    console.error('Error getting exercises by date range:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get exercise summary for a date range
 *
 * @param userId - User ID
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Summary with total calories and exercise count
 */
export async function getExerciseSummaryByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<DbResult<{ totalCalories: number; exerciseCount: number; exercises: ExerciseEntry[] }>> {
  try {
    const exercisesResult = await getExercisesByDateRange(userId, startDate, endDate);

    if (!exercisesResult.success || !exercisesResult.data) {
      return {
        success: false,
        error: exercisesResult.error || 'No data returned',
      };
    }

    const exercises = exercisesResult.data;
    const totalCalories = exercises.reduce(
      (sum, exercise) => sum + (exercise.caloriesBurned?.toNumber?.() || Number(exercise.caloriesBurned)),
      0
    );

    return {
      success: true,
      data: {
        totalCalories,
        exerciseCount: exercises.length,
        exercises,
      },
    };
  } catch (error) {
    console.error('Error getting exercise summary by date range:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get most recent exercise entry for a user
 *
 * @param userId - User ID
 * @param date - Optional date (defaults to today)
 * @returns Most recent exercise entry or null
 */
export async function getRecentExercise(
  userId: string,
  date?: string
): Promise<DbResult<ExerciseEntry | null>> {
  try {
    const targetDate = date ? new Date(date) : new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    const exercise = await prisma.exerciseEntry.findFirst({
      where: {
        userId,
        entryDate: new Date(dateStr),
      },
      orderBy: {
        entryTime: 'desc',
      },
    });

    return { success: true, data: exercise };
  } catch (error) {
    console.error('Error getting recent exercise:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update an existing exercise entry
 *
 * @param exerciseId - Exercise entry ID
 * @param updates - Fields to update
 * @returns Updated exercise entry
 */
export async function updateExerciseEntry(
  exerciseId: string,
  updates: {
    exerciseType?: string;
    durationMinutes?: number;
    caloriesBurned?: number;
    metValue?: number;
  }
): Promise<DbResult<ExerciseEntry>> {
  try {
    const exercise = await prisma.exerciseEntry.update({
      where: { id: exerciseId },
      data: updates,
    });

    return { success: true, data: exercise };
  } catch (error) {
    console.error('Error updating exercise entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete an exercise entry
 *
 * @param exerciseId - Exercise entry ID
 * @returns Database operation result
 */
export async function deleteExerciseEntry(
  exerciseId: string
): Promise<DbResult<void>> {
  try {
    await prisma.exerciseEntry.delete({
      where: { id: exerciseId },
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting exercise entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Replace an exercise entry with multiple new entries
 * Useful for splitting a single exercise into multiple intensity levels
 *
 * @param exerciseId - Exercise entry ID to replace
 * @param newEntries - Array of new exercise entries
 * @returns Array of created exercise entries
 */
export async function replaceExerciseWithMultiple(
  exerciseId: string,
  userId: string,
  newEntries: Array<{
    exerciseType: string;
    durationMinutes: number;
    caloriesBurned: number;
    metValue?: number;
  }>
): Promise<DbResult<ExerciseEntry[]>> {
  try {
    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Delete the old entry
      await tx.exerciseEntry.delete({
        where: { id: exerciseId },
      });

      // Create new entries
      const created = await Promise.all(
        newEntries.map((entry) =>
          tx.exerciseEntry.create({
            data: {
              userId,
              exerciseType: entry.exerciseType,
              durationMinutes: entry.durationMinutes,
              caloriesBurned: entry.caloriesBurned,
              metValue: entry.metValue,
            },
          })
        )
      );

      return created;
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Error replacing exercise entries:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
