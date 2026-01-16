/**
 * Exercise Logger - NO LLM NEEDED
 *
 * When user confirms ("yes"), we already have pending exercise from the estimate.
 * Just save to database and generate confirmation message programmatically.
 */

import type { PendingExercise, ExerciseLoggerResult } from './types';

/**
 * Generate exercise save action and confirmation message (NO LLM CALL)
 * This is called when user confirms saving exercise after an estimate
 */
export function generateExerciseSaveAction(
  pendingExercise: PendingExercise,
  todayBurned: number
): ExerciseLoggerResult {
  const newTotal = todayBurned + pendingExercise.caloriesBurned;

  return {
    action: 'save_exercise',
    data: {
      exerciseType: pendingExercise.exerciseType,
      durationMinutes: pendingExercise.durationMinutes,
      caloriesBurned: pendingExercise.caloriesBurned,
      metValue: pendingExercise.metValue,
    },
    message: `Saved! ${pendingExercise.durationMinutes} min ${pendingExercise.exerciseType}: ${pendingExercise.caloriesBurned} kcal burned. Today total: ${newTotal} kcal`,
  };
}
