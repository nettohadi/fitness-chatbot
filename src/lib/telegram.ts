import TelegramBot from 'node-telegram-bot-api';

// Environment variables
const botToken = process.env.TELEGRAM_BOT_TOKEN;

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
 * @returns Promise with message result or error
 */
export async function sendTelegramMessage(
  chatId: number | string,
  text: string
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  try {
    const bot = getTelegramBot();
    const message = await bot.sendMessage(chatId, text);

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
  action: 'typing' | 'upload_photo' | 'record_video' | 'upload_video' | 'record_voice' | 'upload_voice' | 'upload_document' | 'choose_sticker' | 'find_location' | 'record_video_note' | 'upload_video_note'
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
