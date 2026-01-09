import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage, sendChatAction } from '@/lib/telegram';
import { findOrCreateUser, updateFitnessProfile } from '@/lib/db/users';
import { addCalorieEntry, updateCalorieEntry, deleteCalorieEntry, getDailySummary, getWeeklySummary, getTodayDate, getYesterdayDate, getCurrentWeekRange } from '@/lib/db/calories';
import {
  addExerciseEntry,
  getTodayExercises,
  getTodayExerciseCalories,
  updateExerciseEntry,
  deleteExerciseEntry,
  replaceExerciseWithMultiple,
  getWeeklyExerciseSummary
} from '@/lib/db/exercises';
import { logConversation } from '@/lib/db/conversations';
import {
  getConversationContext,
  addMessageToCache,
} from '@/lib/cache/conversationCache';
import { processWithContext } from '@/lib/services/contextAwareProcessor';
import {
  parseActionFromContext,
  parseStructuredAction,
} from '@/lib/services/actionParser';
import { calculateFitnessMetrics } from '@/lib/services/bmrCalculator';
import { findExerciseType } from '@/lib/services/exerciseTracker';
import { generateErrorMessage } from '@/lib/services/responseGenerator';

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

    // Log incoming message
    await logConversation(userIdentifier, 'incoming', messageText);

    // Add to conversation cache
    addMessageToCache(userIdentifier, 'user', messageText);

    // Get conversation history from cache
    const conversationHistory = await getConversationContext(userIdentifier);

    // Keep typing indicator alive for longer processing
    // Reduced to 3.5s to ensure it refreshes before Telegram's 5s timeout
    console.log('[TYPING] Starting typing indicator interval (every 3.5s)');
    const typingInterval = setInterval(async () => {
      try {
        await sendChatAction(chatId, 'typing');
      } catch (error) {
        console.error('[TYPING] Failed to send typing indicator refresh:', error);
        // Don't clear interval - keep trying
      }
    }, 3500);

    let responseMessage: string;

    try {
      // Fetch today's summary for context
      const today = getTodayDate();
      const todaySummaryResult = await getDailySummary(user.id, today);
      let todaySummaryText = '';

      if (todaySummaryResult.success && todaySummaryResult.data) {
        const summary = todaySummaryResult.data;
        if (summary.entries.length > 0) {
          todaySummaryText = `Total consumed today: ${summary.totalCalories} cal\nEntries with IDs:\n`;
          summary.entries.forEach((entry: any) => {
            const foodName = entry.foodDescription || 'Food item';
            const estimatedTag = entry.estimatedByAi ? ' (estimated)' : '';
            todaySummaryText += `- ID: ${entry.id}\n`;
            todaySummaryText += `  Food: ${foodName}\n`;
            todaySummaryText += `  Calories: ${entry.calories} cal${estimatedTag}\n`;
          });
        }
      }

      // Fetch today's exercises for context
      const todayExercisesResult = await getTodayExercises(user.id);
      let todayExercisesText = '';

      if (todayExercisesResult.success && todayExercisesResult.data && todayExercisesResult.data.length > 0) {
        todayExercisesText = 'Today\'s exercise entries:\n';
        todayExercisesResult.data.forEach((exercise: any) => {
          const caloriesBurned = exercise.caloriesBurned?.toNumber ? exercise.caloriesBurned.toNumber() : exercise.caloriesBurned;
          todayExercisesText += `- ID: ${exercise.id}\n`;
          todayExercisesText += `  Type: ${exercise.exerciseType}\n`;
          todayExercisesText += `  Duration: ${exercise.durationMinutes} minutes\n`;
          todayExercisesText += `  Calories burned: ${caloriesBurned} cal\n`;
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
        await executeAction(structuredAction, user.id);

        // Check if this is a query_summary action
        if (structuredAction.type === 'query_summary') {
          responseMessage = await generateSummaryResponse(user, structuredAction.data.type);
        } else {
          // Extract the user-facing message from the structured action
          responseMessage = structuredAction.userMessage || claudeResponse.replace(/```json[\s\S]*?```/, '').trim();
        }
      } else {
        // Check if user is confirming an action
        const contextAction = parseActionFromContext(conversationHistory, messageText);

        if (contextAction.type !== 'none') {
          // Execute the confirmed action
          await executeAction(contextAction, user.id);
        }

        responseMessage = claudeResponse;
      }
    } finally {
      clearInterval(typingInterval);
      const processingEndTime = Date.now();
      const processingDuration = processingEndTime - processingStartTime;
      console.log('[TYPING] Processing completed in', processingDuration, 'ms');
      console.log('[TYPING] Typing indicator interval cleared');
    }

    // Send response back to user
    await sendTelegramMessage(chatId, responseMessage);

    // Log outgoing message
    await logConversation(userIdentifier, 'outgoing', responseMessage);

    // Add to conversation cache
    addMessageToCache(userIdentifier, 'assistant', responseMessage);

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
 * Generate summary response from database data
 */
async function generateSummaryResponse(user: any, queryType: string): Promise<string> {
  try {
    let targetDate: string = getTodayDate();
    let dateLabel: string = 'Today';

    // Determine the date based on query type
    switch (queryType) {
      case 'today':
        targetDate = getTodayDate();
        dateLabel = 'Today';
        break;
      case 'yesterday':
        targetDate = getYesterdayDate();
        dateLabel = 'Yesterday';
        break;
      case 'week':
        // Handle week separately below
        break;
      default:
        targetDate = getTodayDate();
        dateLabel = 'Today';
    }

    if (queryType === 'today' || queryType === 'yesterday') {
      const summaryResult = await getDailySummary(user.id, targetDate!);

      // Fetch exercise data for the same date
      const exercisesResult = queryType === 'today'
        ? await getTodayExercises(user.id)
        : await getTodayExercises(user.id); // TODO: Add getExercisesByDate for yesterday

      const exerciseCaloriesResult = queryType === 'today'
        ? await getTodayExerciseCalories(user.id)
        : { success: true, data: 0 }; // TODO: Add getExerciseCaloriesByDate for yesterday

      if (!summaryResult.success || !summaryResult.data) {
        // Check if there are exercises even without food
        if (exercisesResult.success && exercisesResult.data && exercisesResult.data.length > 0) {
          let message = `**${dateLabel}'s Summary:** 📊\n\n`;
          message += `You haven't logged any meals yet, but you have exercises!\n\n`;

          message += `**Your exercises:**\n`;
          exercisesResult.data.forEach((exercise: any) => {
            const duration = exercise.durationMinutes;
            const calories = exercise.caloriesBurned?.toNumber
              ? exercise.caloriesBurned.toNumber()
              : exercise.caloriesBurned;
            message += `- ${exercise.exerciseType}: ${duration} min (${calories} cal burned)\n`;
          });

          const burned = exerciseCaloriesResult.data || 0;
          message += `\n- Burned: ${burned} cal (exercises)\n`;
          message += `- Daily Goal: ${user.dailyCalorieGoal || 2000} cal\n`;
          message += `- Net deficit: **${burned} cal** 💪\n\n`;
          message += `Great job staying active! 🏃`;

          return message;
        }
        return `You haven't logged any meals for ${dateLabel.toLowerCase()} yet! 🍽️`;
      }

      const summary = summaryResult.data;
      const consumed = summary.totalCalories;
      const burned = exerciseCaloriesResult.data || 0;
      const netCalories = consumed - burned;
      const dailyGoal = user.dailyCalorieGoal?.toNumber ? user.dailyCalorieGoal.toNumber() : (user.dailyCalorieGoal || 2000);
      const remaining = dailyGoal - netCalories;

      let message = `**${dateLabel}'s Summary:** 📊\n\n`;

      if (summary.entries.length > 0) {
        message += `**What you ate:**\n`;
        summary.entries.forEach((entry: any) => {
          const estimatedTag = entry.estimatedByAi ? ' (estimated)' : '';
          const foodName = entry.foodDescription || 'Food item';
          message += `- ${foodName}: ${entry.calories} cal${estimatedTag}\n`;
        });
        message += `\n`;
      }

      // Add exercises section if any
      if (exercisesResult.success && exercisesResult.data && exercisesResult.data.length > 0) {
        message += `**Your exercises:**\n`;
        exercisesResult.data.forEach((exercise: any) => {
          const duration = exercise.durationMinutes;
          const calories = exercise.caloriesBurned?.toNumber
            ? exercise.caloriesBurned.toNumber()
            : exercise.caloriesBurned;
          message += `- ${exercise.exerciseType}: ${duration} min (${calories} cal burned)\n`;
        });
        message += `\n`;
      }

      message += `- Consumed: ${consumed} cal\n`;
      if (burned > 0) {
        message += `- Burned: ${burned} cal (exercises)\n`;
        message += `- Net: ${netCalories} cal\n`;
      }
      message += `- Daily Goal: ${dailyGoal} cal\n`;
      message += `- Remaining: **${remaining} cal** ${remaining > 0 ? '🍏' : '⚠️'}\n\n`;

      if (remaining > 0) {
        message += `You're doing great - plenty of room for more meals today! 💪`;
      } else {
        message += `You've reached your daily goal! 🎯`;
      }

      return message;
    } else if (queryType === 'week') {
      const weekRange = getCurrentWeekRange();
      const summaryResult = await getWeeklySummary(user.id, weekRange.startDate, weekRange.endDate);
      const exerciseSummaryResult = await getWeeklyExerciseSummary(user.id);

      if (!summaryResult.success || !summaryResult.data) {
        // Check if there are exercises even without food
        if (exerciseSummaryResult.success && exerciseSummaryResult.data && exerciseSummaryResult.data.exerciseCount > 0) {
          let message = `**This Week's Summary:** 📅\n\n`;
          message += `You haven't logged any meals yet, but you have exercises!\n\n`;
          message += `- Exercise Sessions: ${exerciseSummaryResult.data.exerciseCount}\n`;
          message += `- Total Burned: ${exerciseSummaryResult.data.totalCalories} cal\n\n`;
          message += `Great job staying active this week! 💪`;
          return message;
        }
        return "You haven't logged any meals this week yet! 🍽️";
      }

      const summary = summaryResult.data;
      const consumed = summary.totalCalories;
      const burned = exerciseSummaryResult.success && exerciseSummaryResult.data
        ? exerciseSummaryResult.data.totalCalories
        : 0;
      const netCalories = consumed - burned;

      const dailyGoal = user.dailyCalorieGoal?.toNumber ? user.dailyCalorieGoal.toNumber() : (user.dailyCalorieGoal || 2000);
      const weeklyGoal = dailyGoal * 7;
      const remaining = weeklyGoal - netCalories;

      let message = `**This Week's Summary:** 📅\n\n`;
      message += `- Total Consumed: ${consumed} cal\n`;
      if (burned > 0) {
        message += `- Total Burned: ${burned} cal (exercises)\n`;
        message += `- Net: ${netCalories} cal\n`;
      }
      message += `- Weekly Goal: ${weeklyGoal} cal\n`;
      message += `- Remaining: **${remaining} cal**\n`;
      message += `- Food Entries: ${summary.entryCount}\n`;
      if (exerciseSummaryResult.success && exerciseSummaryResult.data) {
        message += `- Exercise Sessions: ${exerciseSummaryResult.data.exerciseCount}\n`;
      }
      message += `\n`;

      if (remaining > 0) {
        message += `Keep up the good work! 💪`;
      } else {
        message += `You've reached your weekly goal! 🎯`;
      }

      return message;
    }

    return "I couldn't generate the summary. Please try again.";
  } catch (error) {
    console.error('Error generating summary:', error);
    return "Sorry, I encountered an error generating your summary. Please try again.";
  }
}

/**
 * Execute an action parsed from conversation
 */
async function executeAction(
  action: any,
  userId: string
): Promise<void> {
  try {
    switch (action.type) {
      case 'save_calories':
        // Check if we have multiple items (for multiple foods)
        if (action.data.items && Array.isArray(action.data.items)) {
          // Save each food item as a separate entry
          console.log(`📝 Saving ${action.data.items.length} food items...`);
          for (const item of action.data.items) {
            await addCalorieEntry(
              userId,
              item.calories,
              item.foodDescription,
              item.estimatedByAi || false
            );
            console.log(`✅ Saved: ${item.foodDescription} - ${item.calories} cal`);
          }
        } else {
          // Single food item
          await addCalorieEntry(
            userId,
            action.data.calories,
            action.data.foodDescription,
            action.data.estimatedByAi || false
          );
          console.log('✅ Saved calories:', action.data.calories);
        }
        break;

      case 'update_calories':
        console.log('📝 Updating calorie entry:', action.data.entryId);
        const calorieUpdateResult = await updateCalorieEntry(
          action.data.entryId,
          action.data.updates
        );
        if (calorieUpdateResult.success) {
          console.log('✅ Calorie entry updated successfully');
        } else {
          console.error('❌ Failed to update calorie entry:', calorieUpdateResult.error);
        }
        break;

      case 'delete_calories':
        console.log('🗑️ Deleting calorie entry:', action.data.entryId);
        const calorieDeleteResult = await deleteCalorieEntry(action.data.entryId);
        if (calorieDeleteResult.success) {
          console.log('✅ Calorie entry deleted successfully');
        } else {
          console.error('❌ Failed to delete calorie entry:', calorieDeleteResult.error);
        }
        break;

      case 'save_exercise':
        const exerciseType = findExerciseType(action.data.exerciseType) || action.data.exerciseType;

        await addExerciseEntry(
          userId,
          exerciseType,
          action.data.durationMinutes,
          action.data.caloriesBurned,
          action.data.metValue
        );
        console.log('✅ Saved exercise:', exerciseType, action.data.durationMinutes, 'min');
        break;

      case 'update_exercise':
        console.log('📝 Updating exercise:', action.data.exerciseId);
        const exerciseUpdateResult = await updateExerciseEntry(
          action.data.exerciseId,
          action.data.updates
        );
        if (exerciseUpdateResult.success) {
          console.log('✅ Exercise updated successfully');
        } else {
          console.error('❌ Failed to update exercise:', exerciseUpdateResult.error);
        }
        break;

      case 'delete_exercise':
        console.log('🗑️ Deleting exercise:', action.data.exerciseId);
        const deleteResult = await deleteExerciseEntry(action.data.exerciseId);
        if (deleteResult.success) {
          console.log('✅ Exercise deleted successfully');
        } else {
          console.error('❌ Failed to delete exercise:', deleteResult.error);
        }
        break;

      case 'replace_exercise':
        console.log('🔄 Replacing exercise with multiple entries');
        console.log('📊 New entries:', JSON.stringify(action.data.newEntries, null, 2));
        const replaceResult = await replaceExerciseWithMultiple(
          action.data.exerciseId,
          userId,
          action.data.newEntries
        );
        if (replaceResult.success) {
          console.log('✅ Exercise replaced successfully with', action.data.newEntries.length, 'new entries');
        } else {
          console.error('❌ Failed to replace exercise:', replaceResult.error);
        }
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

        // Save profile to database
        const updateResult = await updateFitnessProfile(
          userId,
          action.data.age,
          action.data.gender,
          action.data.weightKg,
          action.data.heightCm,
          action.data.activityLevel,
          metrics.bmr,
          metrics.tdee,
          metrics.dailyCalorieGoal
        );

        console.log('💾 Database update result:', updateResult.success ? '✅ Success' : '❌ Failed');
        if (!updateResult.success) {
          console.error('❌ Profile update error:', updateResult.error);
        } else {
          console.log('✅ Profile completed for user:', userId);
        }
        break;

      case 'query_summary':
        console.log('📊 Query summary requested:', action.data.type);
        // Query summary will be handled by returning a special response
        // that the webhook will use to generate the summary message
        action._requiresSummaryResponse = true;
        break;

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
