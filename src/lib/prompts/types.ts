/**
 * Types for the multi-prompt intent-based routing system
 */

// Intent types detected by the intent detector
export type Intent =
  | 'conversation'
  | 'food_estimate'
  | 'food_logging'
  | 'food_update'
  | 'food_clarification' // User mentioned food but no quantity
  | 'exercise_estimate'
  | 'exercise_logging'
  | 'exercise_update'
  | 'exercise_clarification' // User mentioned exercise but no duration
  | 'summary'
  | 'profile_update';

// Supported languages
export type Language = 'id' | 'en';

// Result from intent detection
export interface IntentResult {
  intent: Intent;
  language: Language; // Detected user language
  message?: string; // Only present for 'conversation' intent
  period?: 'today' | 'yesterday' | 'week' | 'month' | 'specific'; // Only present for 'summary' intent
  date?: string; // Only present when period is 'specific' (e.g., "2025-01-10")
}

// Food item in an estimate
export interface FoodEstimateItem {
  food: string;
  calories: number;
  portion?: string;
}

// Result from food estimator
export interface FoodEstimateResult {
  estimate: {
    items: FoodEstimateItem[];
  };
  message: string;
}

// Pending food to be saved (stored in conversation context)
export interface PendingFood {
  items: FoodEstimateItem[];
  timestamp: number;
}

// Food item to save to database
export interface FoodSaveItem {
  foodDescription: string;
  calories: number;
  estimatedByAi: boolean;
}

// Result from food logger
export interface FoodLoggerResult {
  action: 'save_calories';
  data: {
    items: FoodSaveItem[];
  };
  message: string;
}

// Result from food update
export interface FoodUpdateResult {
  action?: 'update_calories' | 'delete_calories';
  data?: {
    entryId: string;
    updates?: {
      calories?: number;
      foodDescription?: string;
    };
  };
  message: string;
}

// Exercise estimate data
export interface ExerciseEstimate {
  exerciseType: string;
  durationMinutes: number;
  caloriesBurned: number;
  metValue: number;
}

// Result from exercise estimator
export interface ExerciseEstimateResult {
  estimate: ExerciseEstimate;
  message: string;
}

// Pending exercise to be saved
export interface PendingExercise {
  exerciseType: string;
  durationMinutes: number;
  caloriesBurned: number;
  metValue: number;
  timestamp: number;
}

// Result from exercise logger
export interface ExerciseLoggerResult {
  action: 'save_exercise';
  data: {
    exerciseType: string;
    durationMinutes: number;
    caloriesBurned: number;
    metValue: number;
  };
  message: string;
}

// Result from exercise update
export interface ExerciseUpdateResult {
  action?: 'update_exercise' | 'delete_exercise';
  data?: {
    exerciseId: string;
    updates?: {
      durationMinutes?: number;
      caloriesBurned?: number;
      exerciseType?: string;
    };
  };
  message: string;
}

// Profile data for save action
export interface ProfileSaveData {
  fullName?: string;
  nickname?: string;
  age?: number;
  gender?: 'male' | 'female';
  weightKg?: number;
  heightCm?: number;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  deficitTarget?: number;
}

// Result from profile setup
export interface ProfileSetupResult {
  action?: 'save_profile';
  data?: ProfileSaveData;
  message: string;
}

// Result from profile update
export interface ProfileUpdateResult {
  action?: 'update_profile';
  data?: Partial<ProfileSaveData>;
  message: string;
}

// Daily breakdown for week/month summaries
export interface DailyBreakdown {
  date: string; // YYYY-MM-DD
  dayName: string; // e.g., "Monday", "Senin"
  consumed: number;
  burned: number;
  deficit: number; // TDEE + burned - consumed
}

// Summary data passed to summary generator
export interface SummaryData {
  period: 'today' | 'yesterday' | 'week' | 'month' | 'specific';
  specificDate?: string; // YYYY-MM-DD format, only when period is 'specific'
  caloriesConsumed: number;
  caloriesBurned: number;
  dailyGoal: number;
  tdee: number; // Total Daily Energy Expenditure
  // For today/yesterday/specific - show food and exercise details
  foodEntries?: Array<{
    id: string;
    food: string;
    calories: number;
    time: string;
  }>;
  exerciseEntries?: Array<{
    id: string;
    type: string;
    duration: number;
    calories: number;
    time: string;
  }>;
  // For week/month - show daily breakdown instead
  dailyBreakdown?: DailyBreakdown[];
}

// User type for prompts (simplified from database User)
export interface PromptUser {
  id: string;
  phoneNumber: string;
  fullName: string | null;
  nickname: string | null;
  age: number | null;
  gender: string | null;
  weightKg: number | null;
  heightCm: number | null;
  activityLevel: string | null;
  bmr: number | null;
  tdee: number | null;
  dailyCalorieGoal: number | null;
  deficitTarget: number | null;
  profileCompleted: boolean;
  preferredLanguage: string | null;
}

// Cached message for conversation history
export interface CachedMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Action result union type
export type ActionResult =
  | FoodLoggerResult
  | FoodUpdateResult
  | ExerciseLoggerResult
  | ExerciseUpdateResult
  | ProfileSetupResult
  | ProfileUpdateResult
  | { message: string };
