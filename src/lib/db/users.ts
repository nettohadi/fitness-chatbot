import prisma from '../prisma';
import type { User, DbResult } from '@/types';

/**
 * Find a user by phone number
 * @param phoneNumber - Phone number in E.164 format
 * @returns DbResult with user data or error
 */
export async function findUserByPhone(
  phoneNumber: string
): Promise<DbResult<User>> {
  try {
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    return { success: true, data: user ? (user as unknown as User) : undefined };
  } catch (error) {
    console.error('Error finding user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a new user
 * @param phoneNumber - Phone number in E.164 format
 * @param timezone - Optional timezone (IANA format, e.g., 'Asia/Jakarta')
 * @param preferredLanguage - Optional preferred language code
 * @returns DbResult with created user data or error
 */
export async function createUser(
  phoneNumber: string,
  timezone?: string,
  preferredLanguage?: string
): Promise<DbResult<User>> {
  try {
    console.log('🔄 Attempting to create user with phone:', phoneNumber);
    console.log('🔌 DATABASE_URL configured:', process.env.DATABASE_URL ? 'YES' : 'NO');
    console.log('🌍 Timezone:', timezone || 'not provided');
    console.log('🗣️ Language:', preferredLanguage || 'not provided');

    const user = await prisma.user.create({
      data: {
        phoneNumber,
        ...(timezone && { timezone }),
        ...(preferredLanguage && { preferredLanguage }),
      },
    });

    console.log('✅ User created successfully:', user.id);
    return { success: true, data: user as unknown as User };
  } catch (error) {
    console.error('❌ Error creating user:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Find or create a user by phone number
 * @param phoneNumber - Phone number in E.164 format
 * @param timezone - Optional timezone for new users (IANA format)
 * @param preferredLanguage - Optional preferred language code for new users
 * @returns DbResult with user data or error
 */
export async function findOrCreateUser(
  phoneNumber: string,
  timezone?: string,
  preferredLanguage?: string
): Promise<DbResult<User>> {
  try {
    // Try to find existing user
    const findResult = await findUserByPhone(phoneNumber);

    if (!findResult.success) {
      return findResult;
    }

    // If user exists, return it
    if (findResult.data) {
      return findResult;
    }

    // User doesn't exist, create a new one with timezone and language
    return await createUser(phoneNumber, timezone, preferredLanguage);
  } catch (error) {
    console.error('Error in findOrCreateUser:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get user by ID
 * @param userId - User UUID
 * @returns DbResult with user data or error
 */
export async function getUserById(userId: string): Promise<DbResult<User>> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    return { success: true, data: user as unknown as User };
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Map of LLM field names to Prisma field names
 * LLMs sometimes use different casing or abbreviations
 */
const FIELD_NAME_MAP: Record<string, string> = {
  // Activity level variations
  activity: 'activityLevel',
  activitylevel: 'activityLevel',
  activity_level: 'activityLevel',
  // BMR variations
  BMR: 'bmr',
  Bmr: 'bmr',
  // TDEE variations
  TDEE: 'tdee',
  Tdee: 'tdee',
  // Daily goal variations
  dailyGoal: 'dailyCalorieGoal',
  daily_goal: 'dailyCalorieGoal',
  dailycaloriegoal: 'dailyCalorieGoal',
  daily_calorie_goal: 'dailyCalorieGoal',
  calorieGoal: 'dailyCalorieGoal',
  // Weight variations
  weight: 'weightKg',
  weight_kg: 'weightKg',
  // Height variations
  height: 'heightCm',
  height_cm: 'heightCm',
  // Deficit variations
  deficit: 'deficitTarget',
  deficit_target: 'deficitTarget',
  // Name variations
  name: 'nickname',
  fullname: 'fullName',
  full_name: 'fullName',
};

/**
 * Valid Prisma field names for user profile updates
 */
const VALID_PROFILE_FIELDS = new Set([
  'age',
  'gender',
  'weightKg',
  'heightCm',
  'activityLevel',
  'bmr',
  'tdee',
  'dailyCalorieGoal',
  'deficitTarget',
  'profileCompleted',
  'preferredLanguage',
  'fullName',
  'nickname',
  'timezone',
]);

/**
 * Update user profile with fitness information
 * @param userId - User UUID
 * @param profileData - Profile data to update (field names are normalized automatically)
 * @returns DbResult with updated user data or error
 */
export async function updateUserProfile(
  userId: string,
  profileData: {
    age?: number;
    gender?: string;
    weightKg?: number;
    heightCm?: number;
    activityLevel?: string;
    bmr?: number;
    tdee?: number;
    dailyCalorieGoal?: number;
    deficitTarget?: number;
    profileCompleted?: boolean;
    preferredLanguage?: string;
    fullName?: string;
    nickname?: string;
    timezone?: string;
    // Allow any additional fields that LLM might send (will be normalized)
    [key: string]: unknown;
  }
): Promise<DbResult<User>> {
  try {
    // Normalize field names and filter out undefined/invalid values
    const cleanedData: Record<string, unknown> = {};

    Object.entries(profileData).forEach(([key, value]) => {
      if (value === undefined) return;

      // Normalize the field name
      const normalizedKey = FIELD_NAME_MAP[key] || key;

      // Only include valid Prisma fields
      if (VALID_PROFILE_FIELDS.has(normalizedKey)) {
        cleanedData[normalizedKey] = value;
      } else {
        console.warn(`[PROFILE-UPDATE] Ignoring unknown field: ${key} (normalized: ${normalizedKey})`);
      }
    });

    console.log(`[PROFILE-UPDATE] Normalized data:`, cleanedData);

    const user = await prisma.user.update({
      where: { id: userId },
      data: cleanedData,
    });

    return { success: true, data: user as unknown as User };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update user's complete fitness profile including calculated metrics
 * @param userId - User UUID
 * @param age - Age in years
 * @param gender - 'male' or 'female'
 * @param weightKg - Weight in kilograms
 * @param heightCm - Height in centimeters
 * @param activityLevel - Activity level
 * @param bmr - Calculated BMR
 * @param tdee - Calculated TDEE
 * @param dailyCalorieGoal - Calculated daily calorie goal
 * @param deficitTarget - Optional deficit target in calories per day
 * @param fullName - Optional full name of the user
 * @param nickname - Optional nickname/preferred name
 * @returns DbResult with updated user data or error
 */
export async function updateFitnessProfile(
  userId: string,
  age: number,
  gender: string,
  weightKg: number,
  heightCm: number,
  activityLevel: string,
  bmr: number,
  tdee: number,
  dailyCalorieGoal: number,
  deficitTarget?: number,
  fullName?: string,
  nickname?: string
): Promise<DbResult<User>> {
  const updates: any = {
    age,
    gender,
    weightKg,
    heightCm,
    activityLevel,
    bmr,
    tdee,
    dailyCalorieGoal,
    profileCompleted: true,
  };

  if (deficitTarget !== undefined) {
    updates.deficitTarget = deficitTarget;
  }

  if (fullName !== undefined) {
    updates.fullName = fullName;
  }

  if (nickname !== undefined) {
    updates.nickname = nickname;
  }

  return updateUserProfile(userId, updates);
}
