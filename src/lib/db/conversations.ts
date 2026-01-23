import { prisma } from '@/lib/prisma';
import type { DbResult } from '@/types';
import { getLocalTodayAsDate } from '@/lib/utils/timezone';

/**
 * Log a conversation message
 * @param chatId - Telegram chat ID
 * @param messageType - Type of message (incoming/outgoing)
 * @param messageBody - Message content
 * @returns Database operation result
 */
export async function logConversation(
  chatId: string,
  messageType: string,
  messageBody: string
): Promise<DbResult<void>> {
  try {
    await prisma.conversationLog.create({
      data: {
        phoneNumber: chatId,
        messageType,
        messageBody,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error logging conversation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get conversation history for a user (today only in user's timezone)
 * @param chatId - Telegram chat ID
 * @param limit - Number of messages to retrieve (default 4)
 * @param timezone - User's timezone (default Asia/Jakarta)
 * @returns Database operation result with conversation logs
 */
export async function getConversationHistory(
  chatId: string,
  limit: number = 4,
  timezone: string = 'Asia/Jakarta'
): Promise<DbResult<any[]>> {
  try {
    // Get start of today in user's timezone
    const today = getLocalTodayAsDate(timezone);

    const logs = await prisma.conversationLog.findMany({
      where: {
        phoneNumber: chatId,
        createdAt: {
          gte: today,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return { success: true, data: logs };
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
