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
