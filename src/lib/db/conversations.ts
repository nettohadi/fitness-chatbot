import { prisma } from '@/lib/prisma';
import type { DbResult } from '@/types';

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
 * Get conversation history for a user
 * @param chatId - Telegram chat ID
 * @param limit - Number of messages to retrieve
 * @returns Database operation result with conversation logs
 */
export async function getConversationHistory(
  chatId: string,
  limit: number = 50
): Promise<DbResult<any[]>> {
  try {
    const logs = await prisma.conversationLog.findMany({
      where: {
        phoneNumber: chatId,
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
