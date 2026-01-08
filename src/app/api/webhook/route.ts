import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';
import { parseMessage, sanitizeInput } from '@/lib/services/messageParser';
import { estimateCaloriesWithClaude } from '@/lib/services/calorieEstimator';
import {
  generateHelpMessage,
  generateDirectCalorieConfirmation,
  generateAiCalorieConfirmation,
  generateDailySummary,
  generateWeeklySummary,
  generateErrorMessage,
  generateCasualResponse,
} from '@/lib/services/responseGenerator';
import { findOrCreateUser } from '@/lib/db/users';
import {
  addCalorieEntry,
  getDailySummary,
  getTodayDate,
  getWeeklySummary,
  getCurrentWeekRange,
} from '@/lib/db/calories';
import { logConversation } from '@/lib/db/conversations';
import { MessageType } from '@/types';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Parse the JSON data from Telegram
    const update: TelegramUpdate = await request.json();

    // Check if this is a valid message update
    if (!update.message || !update.message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const messageText = update.message.text;

    // Sanitize the input
    const sanitizedBody = sanitizeInput(messageText);

    // Use chat ID as identifier (stored in phone_number field for now)
    const userIdentifier = chatId.toString();

    // Find or create user
    const userResult = await findOrCreateUser(userIdentifier);
    if (!userResult.success || !userResult.data) {
      await sendTelegramMessage(chatId, generateErrorMessage('Failed to create user account'));
      return NextResponse.json({ ok: true });
    }

    const user = userResult.data;

    // Log incoming message
    await logConversation(userIdentifier, 'incoming', sanitizedBody);

    // Parse the message to determine its type
    const parsedMessage = parseMessage(sanitizedBody);

    let responseMessage: string;

    switch (parsedMessage.type) {
      case MessageType.HELP:
        responseMessage = generateHelpMessage();
        break;

      case MessageType.QUERY_TODAY:
        responseMessage = await handleTodayQuery(user.id);
        break;

      case MessageType.QUERY_WEEK:
        responseMessage = await handleWeekQuery(user.id);
        break;

      case MessageType.DIRECT_CALORIE:
        responseMessage = await handleDirectCalorie(
          user.id,
          parsedMessage.calories!,
          parsedMessage.description!
        );
        break;

      case MessageType.FOOD_DESCRIPTION:
        responseMessage = await handleFoodDescription(
          user.id,
          parsedMessage.description!
        );
        break;

      case MessageType.CASUAL_CHAT:
        responseMessage = generateCasualResponse(parsedMessage.description || sanitizedBody);
        break;

      default:
        responseMessage = generateErrorMessage('Unknown command. Send "help" for assistance.');
    }

    // Send response back to user
    await sendTelegramMessage(chatId, responseMessage);

    // Log outgoing message
    await logConversation(userIdentifier, 'outgoing', responseMessage);

    // Return success response to Telegram
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in webhook handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle today query
 */
async function handleTodayQuery(userId: string): Promise<string> {
  const today = getTodayDate();
  const summaryResult = await getDailySummary(userId, today);

  if (!summaryResult.success || !summaryResult.data) {
    return generateErrorMessage('Failed to fetch today\'s summary');
  }

  return generateDailySummary(summaryResult.data);
}

/**
 * Handle week query
 */
async function handleWeekQuery(userId: string): Promise<string> {
  const { startDate, endDate } = getCurrentWeekRange();
  const summaryResult = await getWeeklySummary(userId, startDate, endDate);

  if (!summaryResult.success || !summaryResult.data) {
    return generateErrorMessage('Failed to fetch weekly summary');
  }

  return generateWeeklySummary(summaryResult.data);
}

/**
 * Handle direct calorie entry
 */
async function handleDirectCalorie(
  userId: string,
  calories: number,
  description: string
): Promise<string> {
  // Add calorie entry
  const entryResult = await addCalorieEntry(userId, calories, description, false);

  if (!entryResult.success) {
    return generateErrorMessage('Failed to log calories');
  }

  // Get today's total
  const today = getTodayDate();
  const summaryResult = await getDailySummary(userId, today);

  const dailyTotal = summaryResult.success && summaryResult.data
    ? summaryResult.data.totalCalories
    : calories;

  return generateDirectCalorieConfirmation(calories, dailyTotal);
}

/**
 * Handle food description (AI estimation)
 */
async function handleFoodDescription(
  userId: string,
  description: string
): Promise<string> {
  // Estimate calories using Claude
  const estimate = await estimateCaloriesWithClaude(description);

  if (estimate.calories === 0) {
    return generateErrorMessage(estimate.reasoning);
  }

  // Add calorie entry
  const entryResult = await addCalorieEntry(
    userId,
    estimate.calories,
    description,
    true
  );

  if (!entryResult.success) {
    return generateErrorMessage('Failed to log calories');
  }

  // Get today's total
  const today = getTodayDate();
  const summaryResult = await getDailySummary(userId, today);

  const dailyTotal = summaryResult.success && summaryResult.data
    ? summaryResult.data.totalCalories
    : estimate.calories;

  return generateAiCalorieConfirmation(
    estimate.calories,
    description,
    dailyTotal,
    estimate.reasoning
  );
}

// Allow POST method only
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
