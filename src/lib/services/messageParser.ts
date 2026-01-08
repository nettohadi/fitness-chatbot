import { MessageType, type ParsedMessage } from '@/types';

/**
 * Parse an incoming message and determine its type
 * @param message - The message body from the user
 * @returns ParsedMessage with type and extracted data
 */
export function parseMessage(message: string): ParsedMessage {
  const trimmedMessage = message.trim().toLowerCase();

  // Check for help command
  if (isHelpCommand(trimmedMessage)) {
    return { type: MessageType.HELP };
  }

  // Check for today query
  if (isTodayQuery(trimmedMessage)) {
    return { type: MessageType.QUERY_TODAY };
  }

  // Check for week query
  if (isWeekQuery(trimmedMessage)) {
    return { type: MessageType.QUERY_WEEK };
  }

  // Check for direct calorie input
  const calorieMatch = extractDirectCalories(message);
  if (calorieMatch !== null) {
    return {
      type: MessageType.DIRECT_CALORIE,
      calories: calorieMatch,
      description: message,
    };
  }

  // Check for casual conversation/greetings
  if (isCasualChat(trimmedMessage)) {
    return {
      type: MessageType.CASUAL_CHAT,
      description: message,
    };
  }

  // Check if message looks like food (has food-related words or measurements)
  if (isFoodRelated(message)) {
    return {
      type: MessageType.FOOD_DESCRIPTION,
      description: message,
    };
  }

  // Default to casual chat for anything else
  return {
    type: MessageType.CASUAL_CHAT,
    description: message,
  };
}

/**
 * Check if the message is a help command
 * @param message - Lowercase trimmed message
 * @returns true if help command
 */
function isHelpCommand(message: string): boolean {
  const helpKeywords = ['help', 'commands', '?', 'how', 'what can you do'];
  return helpKeywords.some((keyword) => message === keyword || message.includes('help me'));
}

/**
 * Check if the message is a today query
 * @param message - Lowercase trimmed message
 * @returns true if today query
 */
function isTodayQuery(message: string): boolean {
  const todayKeywords = [
    'today',
    'today total',
    'today\'s total',
    'total today',
    'how much today',
    'calories today',
  ];
  return todayKeywords.some((keyword) => message === keyword || message === keyword.replace(/'/g, ''));
}

/**
 * Check if the message is a week query
 * @param message - Lowercase trimmed message
 * @returns true if week query
 */
function isWeekQuery(message: string): boolean {
  const weekKeywords = [
    'week',
    'this week',
    'weekly',
    'week total',
    'weekly total',
    'total week',
    'how much this week',
    'calories this week',
  ];
  return weekKeywords.some((keyword) => message === keyword || message.includes(keyword));
}

/**
 * Extract direct calorie count from message
 * @param message - Original message (not lowercased)
 * @returns Calorie count or null if not found
 */
function extractDirectCalories(message: string): number | null {
  // Pattern: number followed by "cal", "kcal", or "calories"
  // Examples: "450 calories", "320 cal", "150.5 kcal"
  const caloriePattern = /(\d+(?:\.\d+)?)\s*(cal|kcal|calories?)/i;
  const match = message.match(caloriePattern);

  if (match && match[1]) {
    const calories = parseFloat(match[1]);
    // Validate that it's a reasonable number
    if (!isNaN(calories) && calories > 0 && calories < 10000) {
      return calories;
    }
  }

  return null;
}

/**
 * Check if the message is casual chat (greetings, thanks, etc.)
 * @param message - Lowercase trimmed message
 * @returns true if casual chat
 */
function isCasualChat(message: string): boolean {
  const casualKeywords = [
    'hi', 'hello', 'hey', 'sup', 'yo',
    'thanks', 'thank you', 'thx',
    'bye', 'goodbye', 'see you',
    'good morning', 'good night', 'good evening',
    'how are you', 'whats up', "what's up",
    'nice', 'cool', 'awesome', 'great',
    'ok', 'okay', 'sure', 'yes', 'no',
    'lol', 'haha', 'hehe',
  ];

  // Check for short messages (likely greetings/casual)
  if (message.length < 25) {
    return casualKeywords.some((keyword) =>
      message === keyword ||
      message.startsWith(keyword + ' ') ||
      message.startsWith(keyword + ',') ||
      message.startsWith(keyword + '!')
    );
  }

  return false;
}

/**
 * Check if the message is food-related
 * @param message - Original message
 * @returns true if likely food description
 */
function isFoodRelated(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  // Check for measurement units (strong indicator of food)
  const measurements = [
    'gram', 'g ', 'kg', 'kilogram',
    'ml', 'liter', 'oz', 'pound', 'lb',
    'cup', 'tbsp', 'tsp', 'tablespoon', 'teaspoon',
    'slice', 'piece', 'bowl', 'plate', 'serving',
  ];

  if (measurements.some(unit => lowerMessage.includes(unit))) {
    return true;
  }

  // Check for food-related words
  const foodKeywords = [
    'eat', 'ate', 'food', 'meal', 'breakfast', 'lunch', 'dinner', 'snack',
    'rice', 'chicken', 'beef', 'pork', 'fish', 'egg', 'bread', 'pasta',
    'pizza', 'burger', 'sandwich', 'salad', 'soup', 'noodle',
    'fruit', 'vegetable', 'apple', 'banana', 'orange',
    'fried', 'grilled', 'boiled', 'steamed', 'baked',
    'drink', 'water', 'juice', 'coffee', 'tea', 'milk',
  ];

  const matchCount = foodKeywords.filter(keyword => lowerMessage.includes(keyword)).length;

  // If message contains multiple food keywords, it's likely food-related
  return matchCount >= 2 || (matchCount >= 1 && message.length < 50);
}

/**
 * Sanitize user input to prevent injection attacks
 * @param input - Raw user input
 * @returns Sanitized input
 */
export function sanitizeInput(input: string): string {
  // Remove any potentially dangerous characters
  // Allow letters, numbers, spaces, and common punctuation
  return input.replace(/[^\w\s.,!?'"\-()]/g, '').trim();
}
