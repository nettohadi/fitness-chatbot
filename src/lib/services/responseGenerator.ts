import type { CalorieSummary, CalorieEntry } from '@/types';

/**
 * Generate help message
 * @returns Formatted help message
 */
export function generateHelpMessage(): string {
  return `🤖 *Calorie Tracker Help*

*Track calories:*
• Send direct: "450 calories"
• Describe food: "2 slices pizza"
• Include weight: "100g chicken breast"

*Check totals:*
• "today" - Today's total
• "week" - This week's total

*Commands:*
• "help" - Show this message

Just text me what you ate, and I'll track it for you!`;
}

/**
 * Generate confirmation message for direct calorie entry
 * @param calories - Calories logged
 * @param dailyTotal - Total calories for today
 * @returns Formatted confirmation message
 */
export function generateDirectCalorieConfirmation(
  calories: number,
  dailyTotal: number
): string {
  return `✅ Logged ${calories} calories

📊 *Today's total:* ${dailyTotal} cal`;
}

/**
 * Generate confirmation message for AI-estimated calorie entry
 * @param calories - Estimated calories
 * @param foodDescription - Description of the food
 * @param dailyTotal - Total calories for today
 * @param reasoning - AI reasoning (optional)
 * @returns Formatted confirmation message
 */
export function generateAiCalorieConfirmation(
  calories: number,
  foodDescription: string,
  dailyTotal: number,
  reasoning?: string
): string {
  let message = `✅ Estimated ~${calories} calories for "${foodDescription}"`;

  if (reasoning) {
    message += `\n\n💡 ${reasoning}`;
  }

  message += `\n\n📊 *Today's total:* ${dailyTotal} cal`;

  return message;
}

/**
 * Generate daily summary message
 * @param summary - Calorie summary data
 * @returns Formatted daily summary message
 */
export function generateDailySummary(summary: CalorieSummary): string {
  if (summary.entryCount === 0) {
    return `📊 *Today's total:* 0 calories\n\nNo entries logged yet today. Start tracking by sending what you ate!`;
  }

  let message = `📊 *Today's total:* ${Math.round(summary.totalCalories)} calories\n`;
  message += `Entries: ${summary.entryCount}\n\n`;
  message += `*Details:*\n`;

  // Group entries and show them
  const entries = summary.entries.slice(0, 10); // Limit to 10 most recent
  entries.forEach((entry) => {
    const calorieText = `${Math.round(Number(entry.calories))} cal`;
    const description = entry.foodDescription || 'Direct entry';
    const aiIndicator = entry.estimatedByAi ? ' 🤖' : '';
    message += `• ${calorieText} - ${description}${aiIndicator}\n`;
  });

  if (summary.entryCount > 10) {
    message += `\n_...and ${summary.entryCount - 10} more entries_`;
  }

  return message;
}

/**
 * Generate weekly summary message
 * @param summary - Calorie summary data
 * @returns Formatted weekly summary message
 */
export function generateWeeklySummary(summary: CalorieSummary): string {
  if (summary.entryCount === 0) {
    return `📊 *This week's total:* 0 calories\n\nNo entries logged yet this week.`;
  }

  const avgPerDay = Math.round(summary.totalCalories / 7);

  let message = `📊 *This week's total:* ${Math.round(summary.totalCalories)} calories\n`;
  message += `Entries: ${summary.entryCount}\n`;
  message += `Average per day: ${avgPerDay} cal\n\n`;

  // Group by date
  const entriesByDate = groupEntriesByDate(summary.entries);
  message += `*Daily breakdown:*\n`;

  Object.entries(entriesByDate)
    .slice(0, 7)
    .forEach(([date, entries]) => {
      const dailyTotal = entries.reduce((sum, e) => sum + Number(e.calories), 0);
      const formattedDate = formatDate(date);
      message += `• ${formattedDate}: ${Math.round(dailyTotal)} cal (${entries.length} entries)\n`;
    });

  return message;
}

/**
 * Generate error message
 * @param error - Error message or description
 * @returns Formatted error message
 */
export function generateErrorMessage(error?: string): string {
  const defaultError = 'Sorry, something went wrong. Please try again.';
  return `❌ ${error || defaultError}`;
}

/**
 * Generate friendly casual chat response
 * @param message - The user's message
 * @returns Friendly response
 */
export function generateCasualResponse(message: string): string {
  const lowerMessage = message.toLowerCase().trim();

  // Greetings
  if (lowerMessage.match(/^(hi|hello|hey|sup|yo)/)) {
    const responses = [
      "Hey! 👋 How's it going?",
      "Hi there! 😊 What's up?",
      "Hello! How can I help you today?",
      "Hey! Ready to track some calories? 💪",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Thanks
  if (lowerMessage.includes('thank')) {
    const responses = [
      "You're welcome! 😊",
      "Happy to help! 💪",
      "Anytime! That's what I'm here for!",
      "No problem at all! 👍",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // How are you
  if (lowerMessage.includes('how are you')) {
    return "I'm doing great, thanks for asking! 😊 I'm here to help you track your calories. How about you?";
  }

  // Goodbye
  if (lowerMessage.match(/^(bye|goodbye|see you)/)) {
    const responses = [
      "See you later! Stay healthy! 💪",
      "Bye! Keep up the good work! 😊",
      "Goodbye! Don't forget to track your meals! 🍽️",
      "Take care! See you soon! 👋",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Positive reactions
  if (lowerMessage.match(/^(nice|cool|awesome|great|perfect|ok|okay|yes|sure)/)) {
    const responses = [
      "😊 Glad to hear it!",
      "Great! Need anything else?",
      "Awesome! 💪",
      "Perfect! Let me know if you need help!",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Default friendly response
  return "I'm here to help you track your calories! 😊 Just send me what you ate, or type 'help' to see what I can do!";
}

/**
 * Group calorie entries by date
 * @param entries - Array of calorie entries
 * @returns Object with dates as keys and entries as values
 */
function groupEntriesByDate(
  entries: CalorieEntry[]
): Record<string, CalorieEntry[]> {
  return entries.reduce(
    (acc, entry) => {
      const date = entry.entryDate;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(entry);
      return acc;
    },
    {} as Record<string, CalorieEntry[]>
  );
}

/**
 * Format date for display
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Formatted date string (e.g., "Mon, Jan 8")
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };
  return date.toLocaleDateString('en-US', options);
}
