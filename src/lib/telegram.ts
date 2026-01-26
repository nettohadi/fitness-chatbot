import TelegramBot from 'node-telegram-bot-api';

// Environment variables
const botToken = process.env.TELEGRAM_BOT_TOKEN;

/**
 * Escape special characters for MarkdownV2
 * Characters that need escaping: _ * [ ] ( ) ~ ` > # + - = | { } . !
 * @param text - Text to escape
 * @returns Escaped text safe for MarkdownV2
 */
export function escapeMarkdownV2(text: string): string {
  // Replace special characters with escaped versions
  // Do NOT escape characters inside formatting markers
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

/**
 * Format text for MarkdownV2 by converting ** to * and escaping special chars
 * This function handles the conversion from simple markdown (**bold**) to MarkdownV2 (*bold*)
 * and properly escapes special characters outside of formatting markers
 * @param text - Text with simple markdown formatting
 * @returns Text formatted for MarkdownV2
 */
export function formatForMarkdownV2(text: string): string {
  // Use unique Unicode placeholders that won't be escaped
  const BOLD_START = '\u200B\u200C\u200D'; // Zero-width characters
  const BOLD_END = '\u200D\u200C\u200B';   // Reversed for uniqueness

  // Step 1: Replace **text** with placeholders
  let formatted = text.replace(/\*\*([^*]+?)\*\*/g, `${BOLD_START}$1${BOLD_END}`);

  // Step 2: Escape all special MarkdownV2 characters
  formatted = formatted.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');

  // Step 3: Replace placeholders with unescaped * for bold
  formatted = formatted.replace(new RegExp(BOLD_START, 'g'), '*');
  formatted = formatted.replace(new RegExp(BOLD_END, 'g'), '*');

  return formatted;
}

// Lazy-load Telegram bot to avoid build-time initialization
let _telegramBot: TelegramBot | null = null;

function getTelegramBot() {
  if (!_telegramBot) {
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN must be set');
    }
    // Don't use polling in production (use webhooks instead)
    _telegramBot = new TelegramBot(botToken);
  }
  return _telegramBot;
}

/**
 * Send a message via Telegram
 * @param chatId - Telegram chat ID
 * @param text - Message text
 * @param parseMode - Optional parse mode ('MarkdownV2', 'Markdown', 'HTML')
 * @returns Promise with message result or error
 */
export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  parseMode?: 'MarkdownV2' | 'Markdown' | 'HTML'
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  try {
    const bot = getTelegramBot();
    const options: any = {};

    if (parseMode) {
      options.parse_mode = parseMode;
    }

    const message = await bot.sendMessage(chatId, text, options);

    return {
      success: true,
      messageId: message.message_id,
    };
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Helper function to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send multiple messages via Telegram, split by double newlines
 * @param chatId - Telegram chat ID
 * @param text - Message text (will be split by \n\n)
 * @param parseMode - Optional parse mode ('MarkdownV2', 'Markdown', 'HTML')
 * @returns Promise with results for all messages
 */
export async function sendTelegramMessages(
  chatId: number | string,
  text: string,
  parseMode?: 'MarkdownV2' | 'Markdown' | 'HTML'
): Promise<{ success: boolean; messageIds: number[]; errors: string[] }> {
  // Split by double newline and filter empty segments
  const segments = text.split('\n\n').filter(segment => segment.trim().length > 0);

  // If only one segment, use single message function
  if (segments.length <= 1) {
    const result = await sendTelegramMessage(chatId, text, parseMode);
    return {
      success: result.success,
      messageIds: result.messageId ? [result.messageId] : [],
      errors: result.error ? [result.error] : [],
    };
  }

  const messageIds: number[] = [];
  const errors: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    // Add delay between messages (except for the first one)
    if (i > 0) {
      await delay(150);
    }

    const result = await sendTelegramMessage(chatId, segment, parseMode);

    if (result.success && result.messageId) {
      messageIds.push(result.messageId);
    } else if (result.error) {
      errors.push(result.error);
    }
  }

  return {
    success: errors.length === 0,
    messageIds,
    errors,
  };
}

/**
 * Set webhook for Telegram bot
 * @param url - The webhook URL
 * @returns Promise with success status
 */
export async function setTelegramWebhook(
  url: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const bot = getTelegramBot();
    await bot.setWebHook(url);
    return { success: true };
  } catch (error) {
    console.error('Error setting Telegram webhook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get webhook info
 * @returns Promise with webhook info
 */
export async function getWebhookInfo() {
  try {
    const bot = getTelegramBot();
    return await bot.getWebHookInfo();
  } catch (error) {
    console.error('Error getting webhook info:', error);
    throw error;
  }
}

/**
 * Delete webhook
 * @returns Promise with success status
 */
export async function deleteWebhook(): Promise<{ success: boolean; error?: string }> {
  try {
    const bot = getTelegramBot();
    await bot.deleteWebHook();
    return { success: true };
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send chat action (typing indicator)
 * @param chatId - Telegram chat ID
 * @param action - Action type ('typing', 'upload_photo', etc.)
 * @returns Promise with success status
 */
export async function sendChatAction(
  chatId: number | string,
  action: 'typing' | 'upload_photo' | 'record_video' | 'upload_video' | 'record_voice' | 'upload_voice' | 'upload_document'  | 'find_location' | 'record_video_note' | 'upload_video_note'
): Promise<{ success: boolean; error?: string }> {
  try {
    const bot = getTelegramBot();
    await bot.sendChatAction(chatId, action);
    return { success: true };
  } catch (error) {
    console.error('Error sending chat action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
