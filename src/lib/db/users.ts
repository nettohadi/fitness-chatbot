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
 * @returns DbResult with created user data or error
 */
export async function createUser(
  phoneNumber: string
): Promise<DbResult<User>> {
  try {
    const user = await prisma.user.create({
      data: { phoneNumber },
    });

    return { success: true, data: user as unknown as User };
  } catch (error) {
    console.error('Error creating user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Find or create a user by phone number
 * @param phoneNumber - Phone number in E.164 format
 * @returns DbResult with user data or error
 */
export async function findOrCreateUser(
  phoneNumber: string
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

    // User doesn't exist, create a new one
    return await createUser(phoneNumber);
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
 * Update user profile with fitness information
 * @param userId - User UUID
 * @param profileData - Profile data to update
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
  }
): Promise<DbResult<User>> {
  try {
    // Filter out undefined values to avoid Prisma errors
    const cleanedData: any = {};
    Object.keys(profileData).forEach((key) => {
      const value = (profileData as any)[key];
      if (value !== undefined) {
        cleanedData[key] = value;
      }
    });

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
  deficitTarget?: number
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

  return updateUserProfile(userId, updates);
}
