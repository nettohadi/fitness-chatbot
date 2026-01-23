import { LRUCache } from 'lru-cache';

export interface CachedMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// In-memory cache for active conversations
const conversationCache = new LRUCache<string, CachedMessage[]>({
  max: 1000, // Store up to 1000 active users
  ttl: 1000 * 60 * 30, // 30 minutes TTL
  updateAgeOnGet: true, // Reset TTL on access
});

/**
 * Add a message to the conversation cache
 */
export function addMessageToCache(
  chatId: string,
  role: 'user' | 'assistant',
  content: string
): void {
  let messages = conversationCache.get(chatId) || [];

  messages.push({
    role,
    content,
    timestamp: new Date(),
  });

  // Keep only last 4 messages
  if (messages.length > 4) {
    messages = messages.slice(-4);
  }

  conversationCache.set(chatId, messages);
}

/**
 * Get conversation history from database (today only in user's timezone)
 * Note: Must be called BEFORE logging the current incoming message to avoid duplication
 * @param chatId - User identifier (phone number)
 * @param timezone - User's timezone (default Asia/Jakarta)
 */
export async function getConversationContext(
  chatId: string,
  timezone: string = 'Asia/Jakarta'
): Promise<CachedMessage[]> {
  const { getConversationHistory } = await import('@/lib/db/conversations');
  const result = await getConversationHistory(chatId, 4, timezone);

  if (!result.success || !result.data) {
    return [];
  }

  return result.data
    .reverse() // Order: oldest to newest
    .map((log) => ({
      role:
        log.messageType === 'incoming'
          ? ('user' as const)
          : ('assistant' as const),
      content: log.messageBody,
      timestamp: new Date(log.createdAt),
    }));
}

/**
 * Clear conversation cache for a user (useful for testing)
 */
export function clearConversationCache(chatId: string): void {
  conversationCache.delete(chatId);
}

/**
 * Get cache statistics (for monitoring)
 */
export function getCacheStats() {
  return {
    size: conversationCache.size,
    max: conversationCache.max,
  };
}
