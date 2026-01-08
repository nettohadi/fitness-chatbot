import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/twilio';
import { parseMessage, sanitizeInput } from '@/lib/services/messageParser';
import { estimateCaloriesWithClaude } from '@/lib/services/calorieEstimator';
import {
  generateHelpMessage,
  generateDirectCalorieConfirmation,
  generateAiCalorieConfirmation,
  generateDailySummary,
  generateWeeklySummary,
  generateErrorMessage,
} from '@/lib/services/responseGenerator';
import { findOrCreateUser } from '@/lib/db/users';
import {
  addCalorieEntry,
  getDailySummary,
  getTodayDate,
  getWeeklySummary,
  getCurrentWeekRange,
} from '@/lib/db/calories';
import { MessageType } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // Parse the form data from Twilio
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;

    if (!from || !body) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Sanitize the input
    const sanitizedBody = sanitizeInput(body);

    // Extract phone number (remove 'whatsapp:' prefix)
    const phoneNumber = from.replace('whatsapp:', '');

    // Find or create user
    const userResult = await findOrCreateUser(phoneNumber);
    if (!userResult.success || !userResult.data) {
      await sendWhatsAppMessage(from, generateErrorMessage('Failed to create user account'));
      return NextResponse.json({ error: 'User creation failed' }, { status: 500 });
    }

    const user = userResult.data;

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

      default:
        responseMessage = generateErrorMessage('Unknown command. Send "help" for assistance.');
    }

    // Send response back to user
    await sendWhatsAppMessage(from, responseMessage);

    // Return success response to Twilio
    return new NextResponse(null, { status: 200 });
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
