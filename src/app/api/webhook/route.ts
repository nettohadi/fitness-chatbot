import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage, sendChatAction, formatForMarkdownV2 } from '@/lib/telegram';
import { findOrCreateUser, updateFitnessProfile, updateUserProfile } from '@/lib/db/users';
import {
  addCalorieEntry,
  updateCalorieEntry,
  deleteCalorieEntry,
  getTodayDate,
  getYesterdayDate,
  getCurrentWeekRange,
  getCurrentMonthRange,
  getLastNDaysRange,
  getEntriesByDateRange,
  parseSpecificDate
} from '@/lib/db/calories';
import {
  addExerciseEntry,
  updateExerciseEntry,
  deleteExerciseEntry,
  replaceExerciseWithMultiple,
  getExercisesByDateRange,
  getExerciseSummaryByDateRange
} from '@/lib/db/exercises';
import { logConversation } from '@/lib/db/conversations';
import {
  getConversationContext,
} from '@/lib/cache/conversationCache';
import { getCachedTodayData, invalidateTodayCache } from '@/lib/cache/todayDataCache';
import { processWithContext } from '@/lib/services/contextAwareProcessor';
import {
  parseActionFromContext,
  parseStructuredAction,
} from '@/lib/services/actionParser';
import { calculateFitnessMetrics } from '@/lib/services/bmrCalculator';
import { findExerciseType } from '@/lib/services/exerciseTracker';
import { generateErrorMessage } from '@/lib/services/responseGenerator';
// Intent-based routing (new architecture)
import {
  detectIntent,
  processConversation,
  processFoodEstimate,
  processFoodLogging,
  processFoodUpdate,
  processExerciseEstimate,
  processExerciseLogging,
  processExerciseUpdate,
  processSummary,
  processProfileSetup,
  processProfileUpdate,
  toPromptUser,
} from '@/lib/services/intentProcessor';
import type { SummaryData } from '@/lib/prompts';

// Feature flag for new intent-based routing
const USE_INTENT_ROUTING = process.env.USE_INTENT_ROUTING === 'true';

/**
 * Handle message using intent-based routing (new architecture)
 * Flow: Profile pre-check → Intent detection → Specialized processor
 */
async function handleMessageWithIntentRouting(
  messageText: string,
  user: any,
  conversationHistory: any[]
): Promise<{ message: string; action?: any }> {
  const promptUser = toPromptUser(user);

  // STEP 0: Check profile completion FIRST (no LLM call needed)
  if (!user.profileCompleted) {
    console.log('[INTENT-ROUTING] Profile incomplete - routing to profile setup');
    const result = await processProfileSetup(messageText, promptUser, conversationHistory);
    return { message: result.message, action: result.action ? { type: result.action, data: result.data } : undefined };
  }

  // STEP 1: Detect intent
  console.log('[INTENT-ROUTING] Detecting intent...');
  const intentResult = await detectIntent(messageText, promptUser, conversationHistory);
  console.log('[INTENT-ROUTING] Detected intent:', intentResult.intent);

  // STEP 2: Route based on intent
  const language = intentResult.language || 'id';

  switch (intentResult.intent) {
    case 'conversation': {
      // Use dedicated conversation handler (greetings, out-of-scope)
      const response = await processConversation(messageText, promptUser, conversationHistory, language);
      return { message: response };
    }

    // FOOD FLOW
    // Note: food_clarification removed - now handled by conversation intent

    case 'food_estimate': {
      // "I ate rice" → Estimate calories, ask to save
      const result = await processFoodEstimate(messageText, promptUser, conversationHistory);
      // Include estimate data as hidden JSON for later extraction
      const messageWithData = result.estimate
        ? `${result.message}\n<!--ESTIMATE:${JSON.stringify({ estimate: result.estimate })}-->`
        : result.message;
      return { message: messageWithData };
    }

    case 'food_logging': {
      // "yes" after food estimate → Use LLM to extract details and save
      // Get today's calories from cache
      const { getCachedTodayData } = await import('@/lib/cache/todayDataCache');
      const todayData = await getCachedTodayData(user.id);
      const result = await processFoodLogging(messageText, promptUser, conversationHistory, todayData.summary.totalCalories);

      // Check if LLM returned a valid save action
      if ('action' in result && result.action === 'save_calories') {
        // Return action for execution - executeAction will handle save
        // Store both messages so we can use failureMessage if save fails
        return {
          message: result.successMessage,
          action: {
            type: result.action,
            data: result.data,
            successMessage: result.successMessage,
            failureMessage: result.failureMessage
          }
        };
      }

      // LLM couldn't extract food details - return its message
      return { message: (result as { message: string }).message };
    }

    case 'food_update': {
      // "update/delete the rice" → Modify existing entry
      // Support period extraction for yesterday or specific dates
      const foodUpdatePeriod = intentResult.period || 'today';
      let foodEntries: any[] = [];
      let foodPeriodLabel = 'hari ini';

      if (foodUpdatePeriod === 'today') {
        const todayData = await getCachedTodayData(user.id);
        foodEntries = todayData.summary.entries;
        foodPeriodLabel = 'hari ini';
      } else if (foodUpdatePeriod === 'yesterday') {
        const yesterdayDate = getYesterdayDate();
        const result = await getEntriesByDateRange(user.id, yesterdayDate, yesterdayDate);
        foodEntries = result.success && result.data ? result.data : [];
        foodPeriodLabel = 'kemarin';
      } else if (foodUpdatePeriod === 'specific' && intentResult.date) {
        const specificDate = parseSpecificDate(intentResult.date);
        if (specificDate) {
          const result = await getEntriesByDateRange(user.id, specificDate, specificDate);
          foodEntries = result.success && result.data ? result.data : [];
          foodPeriodLabel = intentResult.date;
        }
      }

      // Format food entries with FULL IDs (not truncated)
      const formattedFood = foodEntries.map((e: any) => ({
        id: e.id, // Full UUID
        food: e.foodDescription || 'Food',
        calories: Number(e.calories),
        time: new Date(e.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }));

      const result = await processFoodUpdate(messageText, promptUser, conversationHistory, formattedFood, foodPeriodLabel);
      return {
        message: result.message,
        action: result.action ? { type: result.action, data: result.data } : undefined
      };
    }

    // EXERCISE FLOW
    // Note: exercise_clarification removed - now handled by conversation intent

    case 'exercise_estimate': {
      // "I ran 30 min" → Estimate burn, ask to save
      const result = await processExerciseEstimate(messageText, promptUser, conversationHistory);
      // Include estimate data as hidden JSON for later extraction
      const messageWithData = result.estimate
        ? `${result.message}\n<!--ESTIMATE:${JSON.stringify({ estimate: result.estimate })}-->`
        : result.message;
      return { message: messageWithData };
    }

    case 'exercise_logging': {
      // "yes" after exercise estimate → Use LLM to extract details and save
      // Get today's burned calories from cache
      const { getCachedTodayData } = await import('@/lib/cache/todayDataCache');
      const todayData = await getCachedTodayData(user.id);
      const todayBurned = todayData.exercises.reduce(
        (sum: number, ex: any) => sum + (ex.caloriesBurned?.toNumber ? ex.caloriesBurned.toNumber() : ex.caloriesBurned),
        0
      );
      const result = await processExerciseLogging(messageText, promptUser, conversationHistory, todayBurned);

      // Check if LLM returned a valid save action (single or multiple)
      if ('action' in result && (result.action === 'save_exercise' || result.action === 'save_multiple_exercises')) {
        // Return action for execution - executeAction will handle save
        // Store both messages so we can use failureMessage if save fails
        return {
          message: result.successMessage,
          action: {
            type: result.action,
            data: result.data,
            successMessage: result.successMessage,
            failureMessage: result.failureMessage
          }
        };
      }

      // LLM couldn't extract exercise details - return its message
      return { message: (result as { message: string }).message };
    }

    case 'exercise_update': {
      // "update/delete my run" → Modify existing entry
      // Support period extraction for yesterday or specific dates
      const exerciseUpdatePeriod = intentResult.period || 'today';
      let exerciseEntries: any[] = [];
      let exercisePeriodLabel = 'hari ini';

      if (exerciseUpdatePeriod === 'today') {
        const todayData = await getCachedTodayData(user.id);
        exerciseEntries = todayData.exercises;
        exercisePeriodLabel = 'hari ini';
      } else if (exerciseUpdatePeriod === 'yesterday') {
        const yesterdayDate = getYesterdayDate();
        const result = await getExercisesByDateRange(user.id, yesterdayDate, yesterdayDate);
        exerciseEntries = result.success && result.data ? result.data : [];
        exercisePeriodLabel = 'kemarin';
      } else if (exerciseUpdatePeriod === 'specific' && intentResult.date) {
        const specificDate = parseSpecificDate(intentResult.date);
        if (specificDate) {
          const result = await getExercisesByDateRange(user.id, specificDate, specificDate);
          exerciseEntries = result.success && result.data ? result.data : [];
          exercisePeriodLabel = intentResult.date;
        }
      }

      // Format exercise entries with FULL IDs (not truncated)
      const formattedExercises = exerciseEntries.map((ex: any) => ({
        id: ex.id, // Full UUID
        type: ex.exerciseType,
        duration: ex.durationMinutes,
        calories: ex.caloriesBurned?.toNumber ? ex.caloriesBurned.toNumber() : ex.caloriesBurned,
        time: new Date(ex.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }));

      const result = await processExerciseUpdate(messageText, promptUser, conversationHistory, formattedExercises, exercisePeriodLabel);
      return {
        message: result.message,
        action: result.action ? { type: result.action, data: result.data } : undefined
      };
    }

    // OTHER
    case 'summary': {
      // Period is already extracted by intent detector
      const period = intentResult.period || 'today';

      // For 'today', use cached data for speed
      if (period === 'today') {
        const { getCachedTodayData } = await import('@/lib/cache/todayDataCache');
        const todayData = await getCachedTodayData(user.id);

        const summaryData: SummaryData = {
          period: 'today',
          caloriesConsumed: todayData.summary.totalCalories,
          caloriesBurned: todayData.exercises.reduce(
            (sum: number, ex: any) => sum + (ex.caloriesBurned?.toNumber ? ex.caloriesBurned.toNumber() : ex.caloriesBurned),
            0
          ),
          dailyGoal: promptUser.dailyCalorieGoal || 2000,
          tdee: promptUser.tdee || 2000,
          foodEntries: todayData.summary.entries.map((e: any) => ({
            id: e.id,
            food: e.foodDescription || 'Food',
            calories: e.calories,
            time: new Date(e.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          })),
          exerciseEntries: todayData.exercises.map((ex: any) => ({
            id: ex.id,
            type: ex.exerciseType,
            duration: ex.durationMinutes,
            calories: ex.caloriesBurned?.toNumber ? ex.caloriesBurned.toNumber() : ex.caloriesBurned,
            time: new Date(ex.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          }))
        };

        const result = await processSummary(messageText, promptUser, conversationHistory, summaryData);
        return { message: result };
      }

      // For other periods (yesterday, week, month, specific), fetch from database
      let startDate: string;
      let endDate: string;

      switch (period) {
        case 'yesterday':
          startDate = endDate = getYesterdayDate();
          break;
        case 'week':
          const weekRange = getCurrentWeekRange();
          startDate = weekRange.startDate;
          endDate = weekRange.endDate;
          break;
        case 'month':
          const monthRange = getCurrentMonthRange();
          startDate = monthRange.startDate;
          endDate = monthRange.endDate;
          break;
        case 'specific':
          // Parse the specific date from intent result
          if (intentResult.date) {
            const parsedDate = parseSpecificDate(intentResult.date);
            if (parsedDate) {
              startDate = endDate = parsedDate;
            } else {
              // Fallback to today if date parsing fails
              startDate = endDate = getTodayDate();
            }
          } else {
            startDate = endDate = getTodayDate();
          }
          break;
        default:
          startDate = endDate = getTodayDate();
      }

      // Fetch data for the period
      const caloriesResult = await getEntriesByDateRange(user.id, startDate, endDate);
      const calories = caloriesResult.success && caloriesResult.data ? caloriesResult.data : [];

      const exercisesResult = await getExerciseSummaryByDateRange(user.id, startDate, endDate);
      const exercises = exercisesResult.success && exercisesResult.data ? exercisesResult.data.exercises : [];

      const totalCaloriesConsumed = calories.reduce((sum: number, entry: any) => sum + Number(entry.calories), 0);
      const totalCaloriesBurned = exercises.reduce(
        (sum: number, ex: any) => sum + (ex.caloriesBurned?.toNumber?.() || Number(ex.caloriesBurned)),
        0
      );

      const tdee = promptUser.tdee || 2000;
      const isMultiDay = period === 'week' || period === 'month';

      // Build daily breakdown for week/month
      let dailyBreakdown: SummaryData['dailyBreakdown'] = undefined;
      if (isMultiDay) {
        // Helper to normalize date to YYYY-MM-DD string
        const normalizeDate = (entryDate: any, createdAt: any): string => {
          if (entryDate) {
            // Handle Prisma Date object or string
            if (entryDate instanceof Date) {
              return entryDate.toISOString().split('T')[0];
            }
            // If it's already a string like "2026-01-15", use it directly
            const dateStr = String(entryDate);
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              return dateStr;
            }
          }
          // Fallback to createdAt
          return new Date(createdAt).toISOString().split('T')[0];
        };

        // Group calories by date
        const caloriesByDate: { [date: string]: number } = {};
        calories.forEach((e: any) => {
          const date = normalizeDate(e.entryDate, e.createdAt);
          caloriesByDate[date] = (caloriesByDate[date] || 0) + Number(e.calories);
        });

        // Group exercises by date
        const exercisesByDate: { [date: string]: number } = {};
        exercises.forEach((ex: any) => {
          const date = normalizeDate(ex.entryDate, ex.createdAt);
          const burned = ex.caloriesBurned?.toNumber?.() || Number(ex.caloriesBurned);
          exercisesByDate[date] = (exercisesByDate[date] || 0) + burned;
        });

        // Get all unique dates and sort descending (most recent first)
        const allDates = [...new Set([...Object.keys(caloriesByDate), ...Object.keys(exercisesByDate)])].sort().reverse();

        // Build daily breakdown
        dailyBreakdown = allDates.map(dateStr => {
          const consumed = caloriesByDate[dateStr] || 0;
          const burned = exercisesByDate[dateStr] || 0;
          const deficit = tdee + burned - consumed;
          // Parse date parts manually to avoid timezone issues
          const [year, month, day] = dateStr.split('-').map(Number);
          const dateObj = new Date(year, month - 1, day); // month is 0-indexed
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
          return { date: dateStr, dayName, consumed, burned, deficit };
        });
      }

      const summaryData: SummaryData = {
        period: period,
        specificDate: period === 'specific' ? startDate : undefined,
        caloriesConsumed: totalCaloriesConsumed,
        caloriesBurned: totalCaloriesBurned,
        dailyGoal: promptUser.dailyCalorieGoal || 2000,
        tdee,
        // For week/month: use daily breakdown, skip food/exercise details
        ...(isMultiDay ? {
          dailyBreakdown,
        } : {
          foodEntries: calories.map((e: any) => ({
            id: e.id,
            food: e.foodDescription || 'Food',
            calories: Number(e.calories),
            time: new Date(e.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          })),
          exerciseEntries: exercises.map((ex: any) => ({
            id: ex.id,
            type: ex.exerciseType,
            duration: ex.durationMinutes,
            calories: ex.caloriesBurned?.toNumber?.() || Number(ex.caloriesBurned),
            time: new Date(ex.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          }))
        })
      };

      const result = await processSummary(messageText, promptUser, conversationHistory, summaryData);
      return { message: result };
    }

    case 'profile_update': {
      const result = await processProfileUpdate(messageText, promptUser, conversationHistory);
      return {
        message: result.message,
        action: result.action ? { type: result.action, data: result.data } : undefined
      };
    }

    default:
      // Fallback to conversation
      return { message: intentResult.message || "I'm not sure what you mean. Can you tell me what you ate or what exercise you did?" };
  }
}

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

/**
 * Clean response to ensure no JSON leaks to user
 * Also removes hidden ESTIMATE tags used for data extraction
 */
function cleanResponseForUser(response: string): string {
  // Remove hidden ESTIMATE tags (used for data extraction, not for display)
  let cleaned = response.replace(/\n?<!--ESTIMATE:.*?-->/g, '').trim();

  // Remove JSON code blocks
  cleaned = cleaned.replace(/```json[\s\S]*?```/g, '').trim();

  // If response starts with { or [, it's raw JSON - extract message field
  if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
    try {
      const parsed = JSON.parse(cleaned);
      // Try to extract user-facing message from various possible fields
      if (parsed.message) {
        cleaned = parsed.message;
      } else if (parsed.userMessage) {
        cleaned = parsed.userMessage;
      } else if (parsed.successMessage) {
        cleaned = parsed.successMessage;
      }
    } catch (e) {
      // Not valid JSON or parsing failed
      // Try to find and extract a JSON object from the response
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.message) {
            cleaned = parsed.message;
          } else if (parsed.userMessage) {
            cleaned = parsed.userMessage;
          } else if (parsed.successMessage) {
            cleaned = parsed.successMessage;
          }
        } catch (e2) {
          // Still can't parse, return original
        }
      }
    }
  }

  return cleaned;
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
    const messageText = update.message.text.trim();

    // Use chat ID as identifier
    const userIdentifier = chatId.toString();

    // Find or create user
    const userResult = await findOrCreateUser(userIdentifier);
    if (!userResult.success || !userResult.data) {
      await sendTelegramMessage(chatId, generateErrorMessage('Failed to create user account'));
      return NextResponse.json({ ok: true });
    }

    const user = userResult.data;

    // Track processing time for debugging
    const processingStartTime = Date.now();

    // Show typing indicator immediately
    console.log('[TYPING] Sending initial typing indicator to chatId:', chatId);
    const initialTypingResult = await sendChatAction(chatId, 'typing').catch((error) => {
      console.error('[TYPING] Failed to send initial typing indicator:', error);
      return { success: false, error };
    });
    if (!initialTypingResult.success) {
      console.error('[TYPING] Initial typing indicator failed immediately');
    }

    // Get conversation history BEFORE logging the current message
    // This prevents the current message from appearing in history (avoiding duplication)
    const conversationHistory = await getConversationContext(userIdentifier);

    // NEW INTENT-BASED ROUTING (feature flag controlled)
    if (USE_INTENT_ROUTING) {
      console.log('[ROUTING] Using new intent-based routing');

      // Keep typing indicator alive
      const typingInterval = setInterval(() => {
        sendChatAction(chatId, 'typing').catch(() => {});
      }, 4000);

      let responseMessage: string;
      try {
        const result = await handleMessageWithIntentRouting(messageText, user, conversationHistory);
        responseMessage = result.message;

        // Execute action if present
        if (result.action) {
          try {
            await executeAction(result.action, user.id, user, conversationHistory);
            // Use successMessage if available (from food_logging/exercise_logging)
            if (result.action.successMessage) {
              responseMessage = result.action.successMessage;
            }
          } catch (actionError) {
            console.error('[INTENT-ROUTING] Action execution failed:', actionError);
            // Use failureMessage if available, otherwise use generic error
            if (result.action.failureMessage) {
              responseMessage = result.action.failureMessage;
            } else {
              responseMessage = 'Sorry, something went wrong. Please try again.';
            }
          }
        }

        // Clean response
        responseMessage = cleanResponseForUser(responseMessage);
      } finally {
        clearInterval(typingInterval);
        const processingDuration = Date.now() - processingStartTime;
        console.log('[INTENT-ROUTING] Processing completed in', processingDuration, 'ms');
      }

      // Send message and log
      await Promise.all([
        sendTelegramMessage(chatId, formatForMarkdownV2(responseMessage), 'MarkdownV2'),
        logConversation(userIdentifier, 'incoming', messageText),
        logConversation(userIdentifier, 'outgoing', responseMessage),
      ]);

      return NextResponse.json({ ok: true });
    }

    // LEGACY ROUTING (original implementation)
    // Helper function: Check if message is a simple confirmation
    const isSimpleConfirmation = (text: string): boolean => {
      const confirmations = /^(yes|ya|ok|oke|iya|no|tidak|cancel|batal|skip)$/i;
      return confirmations.test(text.trim());
    };

    // Helper function: Check if profile setup is in progress
    const isProfileSetupInProgress = (): boolean => {
      return !user.profileCompleted;
    };

    // Smart Quick Exit #1: Simple confirmations
    // Skip data fetching if user is just confirming a previous action
    if (isSimpleConfirmation(messageText)) {
      console.log('[OPTIMIZATION] Simple confirmation detected, checking context...');

      const contextAction = parseActionFromContext(conversationHistory, messageText);

      if (contextAction && contextAction.type !== 'none') {
        console.log('[OPTIMIZATION] Executing context action:', contextAction.type);
        console.log('[OPTIMIZATION] Skipping DB queries - using cached context');

        let responseText = await executeAction(contextAction, user.id, user, conversationHistory);

        // Clean response to ensure no JSON leaks
        responseText = cleanResponseForUser(responseText || 'Done!');

        // Send message and log both incoming + outgoing
        await Promise.all([
          sendTelegramMessage(chatId, formatForMarkdownV2(responseText), 'MarkdownV2'),
          logConversation(userIdentifier, 'incoming', messageText),
          logConversation(userIdentifier, 'outgoing', responseText),
        ]);

        return NextResponse.json({ success: true });
      }
      // If no pending action found, fall through to normal flow
    }

    // Smart Quick Exit #2: Profile setup
    // Skip data fetching during profile setup (no data exists yet)
    if (isProfileSetupInProgress()) {
      console.log('[OPTIMIZATION] Profile setup in progress, skipping data fetch');

      const response = await processWithContext(
        messageText,
        conversationHistory,
        user,
        undefined,  // No today summary
        undefined   // No today exercises
      );

      const parsedAction = parseStructuredAction(response);

      if (parsedAction && parsedAction.type !== 'none') {
        await executeAction(parsedAction, user.id, user, conversationHistory);
        let responseText = parsedAction.userMessage || response;

        // Clean response to ensure no JSON leaks
        responseText = cleanResponseForUser(responseText);

        // Send message and log both incoming + outgoing
        await Promise.all([
          sendTelegramMessage(chatId, formatForMarkdownV2(responseText), 'MarkdownV2'),
          logConversation(userIdentifier, 'incoming', messageText),
          logConversation(userIdentifier, 'outgoing', responseText),
        ]);
      } else {
        // Clean response to ensure no JSON leaks
        const cleanedResponse = cleanResponseForUser(response);

        // Send message and log both incoming + outgoing
        await Promise.all([
          sendTelegramMessage(chatId, formatForMarkdownV2(cleanedResponse), 'MarkdownV2'),
          logConversation(userIdentifier, 'incoming', messageText),
          logConversation(userIdentifier, 'outgoing', cleanedResponse),
        ]);
      }

      return NextResponse.json({ success: true });
    }

    // Keep typing indicator alive for longer processing
    // Reduced to 4s to ensure it refreshes before Telegram's 5s timeout
    console.log('[TYPING] Starting typing indicator interval (every 4s)');
    const typingInterval = setInterval(() => {
      // Send typing indicator without awaiting to avoid blocking
      sendChatAction(chatId, 'typing')
        .then((result) => {
          if (result.success) {
            console.log('[TYPING] Typing indicator refreshed successfully');
          } else {
            console.error('[TYPING] Typing indicator refresh failed:', result.error);
          }
        })
        .catch((error) => {
          console.error('[TYPING] Exception while refreshing typing indicator:', error);
        });
    }, 4000);

    let responseMessage: string;

    try {
      // Fetch today's data with caching (reduces DB queries by ~80% for active users)
      const todayData = await getCachedTodayData(user.id);
      let todaySummaryText = '';
      let todayExercisesText = '';

      // Build food summary text
      // IDs are included for internal reference (update/delete), but model should NOT show IDs to user
      const summary = todayData.summary;
      if (summary.entries.length > 0) {
        todaySummaryText = `Total consumed today: ${summary.totalCalories} cal\nEntries (IDs for internal use only - NEVER show IDs to user):\n`;
        summary.entries.forEach((entry: any, index: number) => {
          const foodName = entry.foodDescription || 'Food item';
          const estimatedTag = entry.estimatedByAi ? ' (estimated)' : '';
          todaySummaryText += `${index + 1}. ${foodName}: ${entry.calories} cal${estimatedTag} [id:${entry.id}]\n`;
        });
      }

      // Build exercise summary text
      // IDs are included for internal reference (update/delete), but model should NOT show IDs to user
      if (todayData.exercises.length > 0) {
        todayExercisesText = 'Today\'s exercise entries (IDs for internal use only - NEVER show IDs to user):\n';
        todayData.exercises.forEach((exercise: any, index: number) => {
          const caloriesBurned = exercise.caloriesBurned?.toNumber ? exercise.caloriesBurned.toNumber() : exercise.caloriesBurned;
          todayExercisesText += `${index + 1}. ${exercise.exerciseType}: ${exercise.durationMinutes} min, ${caloriesBurned} cal burned [id:${exercise.id}]\n`;
        });
      }

      // Process message with Claude using conversation context
      const claudeResponse = await processWithContext(
        messageText,
        conversationHistory,
        user,
        todaySummaryText,
        todayExercisesText
      );

      // Check for structured actions in Claude's response
      console.log('🔍 Claude response length:', claudeResponse.length);
      console.log('🔍 Claude response preview:', claudeResponse.substring(0, 500));

      const structuredAction = parseStructuredAction(claudeResponse);
      console.log('🔍 Parsed structured action:', structuredAction ? JSON.stringify(structuredAction, null, 2) : 'null');

      if (structuredAction) {
        // Execute structured action (including save_profile from Claude)
        const actionResult = await executeAction(structuredAction, user.id, user, conversationHistory);

        // If action returned a summary (for historical queries), use it
        // Otherwise use the userMessage from Claude
        if (actionResult && typeof actionResult === 'string') {
          responseMessage = actionResult;
        } else {
          responseMessage = structuredAction.userMessage || claudeResponse.replace(/```json[\s\S]*?```/, '').trim();
        }
      } else {
        // Check if user is confirming an action
        const contextAction = parseActionFromContext(conversationHistory, messageText);

        if (contextAction.type !== 'none') {
          // Execute the confirmed action
          await executeAction(contextAction, user.id, user, conversationHistory);
        }

        responseMessage = claudeResponse;
      }

      // Clean response to ensure no JSON leaks to user
      responseMessage = cleanResponseForUser(responseMessage);
    } finally {
      clearInterval(typingInterval);
      const processingEndTime = Date.now();
      const processingDuration = processingEndTime - processingStartTime;
      console.log('[TYPING] Processing completed in', processingDuration, 'ms');
      console.log('[TYPING] Typing indicator interval cleared');
    }

    // Send response back to user with MarkdownV2 formatting
    const formattedMessage = formatForMarkdownV2(responseMessage);

    // Send message and log both incoming + outgoing
    await Promise.all([
      sendTelegramMessage(chatId, formattedMessage, 'MarkdownV2'),
      logConversation(userIdentifier, 'incoming', messageText),
      logConversation(userIdentifier, 'outgoing', responseMessage),
    ]);

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
 * Generate summary for date range queries
 */
async function generateDateRangeSummary(
  action: any,
  userId: string,
  user: any,
  conversationContext: any[]
): Promise<string> {
  try {
    let startDate: string;
    let endDate: string;
    let periodLabel: string;

    // Determine date range based on query type
    switch (action.data.type) {
      case 'yesterday':
        const yesterday = getYesterdayDate();
        startDate = yesterday;
        endDate = yesterday;
        periodLabel = 'yesterday';
        break;

      case 'week':
        const weekRange = getCurrentWeekRange();
        startDate = weekRange.startDate;
        endDate = weekRange.endDate;
        periodLabel = 'this week';
        break;

      case 'month':
        const monthRange = getCurrentMonthRange();
        startDate = monthRange.startDate;
        endDate = monthRange.endDate;
        periodLabel = 'this month';
        break;

      case 'last_n_days':
        const daysRange = getLastNDaysRange(action.data.days || 7);
        startDate = daysRange.startDate;
        endDate = daysRange.endDate;
        periodLabel = `the last ${action.data.days || 7} days`;
        break;

      case 'date_range':
        startDate = action.data.startDate;
        endDate = action.data.endDate;
        periodLabel = `the period from ${startDate} to ${endDate}`;
        break;

      default:
        return 'Invalid query type';
    }

    // Fetch calorie data
    const caloriesResult = await getEntriesByDateRange(userId, startDate, endDate);
    const calories = caloriesResult.success && caloriesResult.data ? caloriesResult.data : [];

    // Fetch exercise data
    const exercisesResult = await getExerciseSummaryByDateRange(userId, startDate, endDate);
    const exercises = exercisesResult.success && exercisesResult.data ? exercisesResult.data.exercises : [];

    // Calculate totals
    const totalCaloriesConsumed = calories.reduce((sum, entry) => sum + Number(entry.calories), 0);
    const totalCaloriesBurned = exercises.reduce(
      (sum, ex) => sum + (ex.caloriesBurned?.toNumber?.() || Number(ex.caloriesBurned)),
      0
    );
    const netCalories = totalCaloriesConsumed - totalCaloriesBurned;

    // Calculate average daily values for multi-day periods
    const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const avgDailyConsumed = Math.round(totalCaloriesConsumed / daysDiff);
    const avgDailyBurned = Math.round(totalCaloriesBurned / daysDiff);

    // Organize data by date for better context
    const foodByDate: { [date: string]: typeof calories } = {};
    calories.forEach(entry => {
      const date = entry.entryDate.toString();
      if (!foodByDate[date]) foodByDate[date] = [];
      foodByDate[date].push(entry);
    });

    const exerciseByDate: { [date: string]: typeof exercises } = {};
    exercises.forEach(ex => {
      const date = ex.entryDate.toString();
      if (!exerciseByDate[date]) exerciseByDate[date] = [];
      exerciseByDate[date].push(ex);
    });

    // Calculate TDEE and deficit
    const tdee = user.tdee?.toNumber?.() || user.tdee || 2000;
    const totalTdee = tdee * daysDiff;
    const totalDeficit = totalTdee + totalCaloriesBurned - totalCaloriesConsumed;
    const avgDailyDeficit = Math.round(totalDeficit / daysDiff);

    // Build structured data for Claude to format
    const structuredData = {
      period: periodLabel,
      startDate,
      endDate,
      dayCount: daysDiff,
      totals: {
        consumed: totalCaloriesConsumed,
        burned: totalCaloriesBurned,
        net: netCalories,
        deficit: totalDeficit,
      },
      averages: daysDiff > 1 ? {
        consumedPerDay: avgDailyConsumed,
        burnedPerDay: avgDailyBurned,
        deficitPerDay: avgDailyDeficit,
      } : null,
      tdee,
      dailyGoal: user.dailyCalorieGoal?.toNumber?.() || user.dailyCalorieGoal || null,
      foodByDate: Object.keys(foodByDate).sort().reverse().slice(0, 5).map(date => ({
        date,
        total: foodByDate[date].reduce((sum, e) => sum + Number(e.calories), 0),
        entries: foodByDate[date].slice(0, 5).map(e => ({
          description: e.foodDescription || 'Food',
          calories: Number(e.calories),
        })),
        hasMore: foodByDate[date].length > 5,
        totalEntries: foodByDate[date].length,
      })),
      exerciseByDate: Object.keys(exerciseByDate).sort().reverse().slice(0, 5).map(date => ({
        date,
        total: exerciseByDate[date].reduce(
          (sum, e) => sum + (e.caloriesBurned?.toNumber?.() || Number(e.caloriesBurned)),
          0
        ),
        entries: exerciseByDate[date].slice(0, 5).map(e => ({
          type: e.exerciseType,
          duration: e.durationMinutes,
          burned: e.caloriesBurned?.toNumber?.() || Number(e.caloriesBurned),
        })),
        hasMore: exerciseByDate[date].length > 5,
        totalEntries: exerciseByDate[date].length,
      })),
    };

    // Create a prompt for Claude to format this naturally
    const summaryPrompt = `The user requested a summary for ${periodLabel}. Format this data naturally in the user's language and communication style:

${JSON.stringify(structuredData, null, 2)}

Important:
- Use the user's language (detect from conversation history)
- Match their communication style (formal/casual, emoji usage, etc.)
- Show key metrics: Goal, Consumed, Exercise, Remaining, Deficit
- Deficit = TDEE + Exercise - Consumed (positive = weight loss, negative = surplus)
- For multi-day periods, show both totals and daily averages
- Tell a story, don't just dump data
- Highlight interesting patterns (e.g., "strong start to the week", "weekend splurge", etc.)
- Compare to their daily goal if available
- Be encouraging if they're on track, supportive if they're struggling
- Keep it conversational and engaging`;

    // Use Claude to format the summary naturally
    const response = await processWithContext(
      summaryPrompt,
      conversationContext,
      user,
      undefined, // No today summary needed
      undefined  // No today exercises needed
    );

    return response;
  } catch (error) {
    console.error('Error generating date range summary:', error);
    return 'Sorry, I encountered an error generating the summary.';
  }
}

/**
 * Execute an action parsed from conversation
 */
async function executeAction(
  action: any,
  userId: string,
  user?: any,
  conversationContext?: any[]
): Promise<string | void> {
  try {
    switch (action.type) {
      case 'save_calories':
        // Check if we have multiple items (for multiple foods)
        if (action.data.items && Array.isArray(action.data.items)) {
          // Save each food item as a separate entry
          console.log(`📝 Saving ${action.data.items.length} food items...`);
          for (const item of action.data.items) {
            const saveResult = await addCalorieEntry(
              userId,
              item.calories,
              item.foodDescription,
              item.estimatedByAi || false
            );
            if (!saveResult.success) {
              throw new Error(saveResult.error || 'Failed to save calorie entry');
            }
            console.log(`✅ Saved: ${item.foodDescription} - ${item.calories} cal`);
          }
        } else {
          // Single food item
          const saveResult = await addCalorieEntry(
            userId,
            action.data.calories,
            action.data.foodDescription,
            action.data.estimatedByAi || false
          );
          if (!saveResult.success) {
            throw new Error(saveResult.error || 'Failed to save calorie entry');
          }
          console.log('✅ Saved calories:', action.data.calories);
        }
        // Invalidate cache after saving
        invalidateTodayCache(userId);
        break;

      case 'update_calories':
        console.log('📝 Updating calorie entry:', action.data.entryId);
        const calorieUpdateResult = await updateCalorieEntry(
          action.data.entryId,
          action.data.updates
        );
        if (!calorieUpdateResult.success) {
          throw new Error(calorieUpdateResult.error || 'Failed to update calorie entry');
        }
        console.log('✅ Calorie entry updated successfully');
        invalidateTodayCache(userId);
        break;

      case 'delete_calories':
        // Support single entryId or array of entryIds
        const entryIds = action.data.entryIds || (action.data.entryId ? [action.data.entryId] : []);
        console.log('🗑️ Deleting calorie entries:', entryIds);

        for (const entryId of entryIds) {
          const calorieDeleteResult = await deleteCalorieEntry(entryId);
          if (!calorieDeleteResult.success) {
            throw new Error(calorieDeleteResult.error || `Failed to delete calorie entry: ${entryId}`);
          }
        }
        console.log(`✅ Deleted ${entryIds.length} calorie entries successfully`);
        invalidateTodayCache(userId);
        break;

      case 'save_exercise':
        const exerciseType = findExerciseType(action.data.exerciseType) || action.data.exerciseType;

        // Check if user provided calories burned explicitly
        const userProvidedCalories = action.data.caloriesBurned && action.data.userProvidedCalories;

        let finalCalories: number;
        let finalMetValue: number | undefined;

        if (userProvidedCalories) {
          // User explicitly provided calories - use their value
          finalCalories = action.data.caloriesBurned;
          finalMetValue = undefined; // No MET value when user provides calories
          console.log('📊 Using user-provided calories:', finalCalories);
        } else {
          // Calculate calories burned SERVER-SIDE
          const { calculateCaloriesBurned } = await import('@/lib/services/exerciseTracker');
          const weightKg = user?.weightKg?.toNumber ? user.weightKg.toNumber() : Number(user?.weightKg) || 70;
          const { calories: serverCalories, metValue: serverMetValue } = calculateCaloriesBurned(
            exerciseType,
            action.data.durationMinutes,
            weightKg
          );
          finalCalories = serverCalories;
          finalMetValue = serverMetValue;
          console.log('📊 Using server-calculated calories:', finalCalories, '(MET:', finalMetValue, ')');
        }

        const exerciseSaveResult = await addExerciseEntry(
          userId,
          exerciseType,
          action.data.durationMinutes,
          finalCalories,
          finalMetValue
        );
        if (!exerciseSaveResult.success) {
          throw new Error(exerciseSaveResult.error || 'Failed to save exercise entry');
        }
        console.log('✅ Saved exercise:', exerciseType, action.data.durationMinutes, 'min,', finalCalories, 'kcal');
        invalidateTodayCache(userId);
        break;

      case 'save_multiple_exercises':
        console.log('📝 Saving multiple exercise entries');
        const { calculateCaloriesBurned: calcCalories } = await import('@/lib/services/exerciseTracker');
        const userWeightKg = user?.weightKg?.toNumber ? user.weightKg.toNumber() : Number(user?.weightKg) || 70;

        // Process each entry with server-side calculation
        for (const entry of action.data.entries) {
          const normalizedType = findExerciseType(entry.exerciseType) || entry.exerciseType;
          const { calories: entryCalories, metValue: entryMetValue } = calcCalories(
            normalizedType,
            entry.durationMinutes,
            userWeightKg
          );

          const multiSaveResult = await addExerciseEntry(
            userId,
            normalizedType,
            entry.durationMinutes,
            entryCalories,
            entryMetValue
          );
          if (!multiSaveResult.success) {
            throw new Error(multiSaveResult.error || 'Failed to save exercise entry');
          }
          console.log(`  ✅ Saved: ${normalizedType} ${entry.durationMinutes} min, ${entryCalories} kcal (MET ${entryMetValue})`);
        }
        console.log(`✅ Saved ${action.data.entries.length} exercise entries`);
        invalidateTodayCache(userId);
        break;

      case 'update_exercise':
        console.log('📝 Updating exercise:', action.data.exerciseId);
        const exerciseUpdateResult = await updateExerciseEntry(
          action.data.exerciseId,
          action.data.updates
        );
        if (!exerciseUpdateResult.success) {
          throw new Error(exerciseUpdateResult.error || 'Failed to update exercise');
        }
        console.log('✅ Exercise updated successfully');
        invalidateTodayCache(userId);
        break;

      case 'delete_exercise':
        console.log('🗑️ Deleting exercise:', action.data.exerciseId);
        const deleteResult = await deleteExerciseEntry(action.data.exerciseId);
        if (!deleteResult.success) {
          throw new Error(deleteResult.error || 'Failed to delete exercise');
        }
        console.log('✅ Exercise deleted successfully');
        invalidateTodayCache(userId);
        break;

      case 'replace_exercise':
        console.log('🔄 Replacing exercise with multiple entries');
        console.log('📊 New entries:', JSON.stringify(action.data.newEntries, null, 2));

        // Recalculate each entry SERVER-SIDE for accuracy
        const { calculateCaloriesBurned: calcCals } = await import('@/lib/services/exerciseTracker');
        const userWeight = user?.weightKg?.toNumber ? user.weightKg.toNumber() : Number(user?.weightKg) || 70;

        const recalculatedEntries = action.data.newEntries.map((entry: any) => {
          const { calories, metValue } = calcCals(
            entry.exerciseType,
            entry.durationMinutes,
            userWeight
          );

          console.log(
            `🔢 Recalculated: ${entry.exerciseType} ${entry.durationMinutes}min = ${calories}kcal ` +
            `(Claude: ${entry.caloriesBurned}kcal)`
          );

          return {
            exerciseType: entry.exerciseType,
            durationMinutes: entry.durationMinutes,
            caloriesBurned: calories,  // Use server calculation
            metValue: metValue         // Use server MET value
          };
        });

        const replaceResult = await replaceExerciseWithMultiple(
          action.data.exerciseId,
          userId,
          recalculatedEntries  // Use recalculated entries
        );
        if (!replaceResult.success) {
          throw new Error(replaceResult.error || 'Failed to replace exercise');
        }
        console.log('✅ Exercise replaced successfully with', recalculatedEntries.length, 'new entries');
        invalidateTodayCache(userId);
        break;

      case 'save_profile':
        console.log('✅ Profile data received from Claude! Saving to database...');
        console.log('📊 Profile data:', JSON.stringify(action.data, null, 2));

        // Calculate fitness metrics
        const metrics = calculateFitnessMetrics(
          action.data.age,
          action.data.gender,
          action.data.weightKg,
          action.data.heightCm,
          action.data.activityLevel
        );

        console.log('📊 Calculated metrics:', JSON.stringify(metrics, null, 2));

        // Save profile to database (including optional name and deficit target)
        const updateResult = await updateFitnessProfile(
          userId,
          action.data.age,
          action.data.gender,
          action.data.weightKg,
          action.data.heightCm,
          action.data.activityLevel,
          metrics.bmr,
          metrics.tdee,
          metrics.dailyCalorieGoal,
          action.data.deficitTarget,
          action.data.fullName,
          action.data.nickname
        );

        console.log('💾 Database update result:', updateResult.success ? '✅ Success' : '❌ Failed');
        if (!updateResult.success) {
          console.error('❌ Profile update error:', updateResult.error);
        } else {
          console.log('✅ Profile completed for user:', userId);
        }
        break;

      case 'update_profile':
        console.log('📝 Updating user profile with data:', JSON.stringify(action.data, null, 2));

        // Use updateUserProfile to update only the specified fields
        const profileUpdateResult = await updateUserProfile(userId, action.data);

        console.log('💾 Profile update result:', profileUpdateResult.success ? '✅ Success' : '❌ Failed');
        if (!profileUpdateResult.success) {
          console.error('❌ Profile update error:', profileUpdateResult.error);
        }
        break;

      case 'query_summary':
        console.log('📊 Query summary requested:', action.data.type);

        // For "today" queries, Claude already generated the summary in userMessage
        if (action.data.type === 'today') {
          console.log('📊 Today query - using Claude-generated summary');
          return action.userMessage || 'Summary generated successfully.';
        }

        // For historical queries, generate summary from database
        if (user) {
          console.log('📊 Generating historical summary for:', action.data.type);
          const summary = await generateDateRangeSummary(
            action,
            userId,
            user,
            conversationContext || []
          );
          return summary;
        }

        // Fallback
        return action.userMessage || 'Unable to generate summary.';


      default:
        console.log('No action to execute:', action.type);
    }
  } catch (error) {
    console.error('Error executing action:', error);
    throw error;
  }
}

// Allow POST method only
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
