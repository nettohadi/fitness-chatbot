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

  // Keep only last 10 messages
  if (messages.length > 10) {
    messages = messages.slice(-10);
  }

  conversationCache.set(chatId, messages);
}

/**
 * Get conversation history from cache or database
 */
export async function getConversationContext(
  chatId: string
): Promise<CachedMessage[]> {
  // Try cache first
  let messages = conversationCache.get(chatId);

  if (!messages) {
    // Cache miss - fetch from database
    const { getConversationHistory } = await import('@/lib/db/conversations');
    const result = await getConversationHistory(chatId, 10);

    if (result.success && result.data) {
      messages = result.data
        .reverse() // Order: oldest to newest
        .map((log) => ({
          role:
            log.messageType === 'incoming'
              ? ('user' as const)
              : ('assistant' as const),
          content: log.messageBody,
          timestamp: new Date(log.createdAt),
        }));

      // Populate cache for next time
      conversationCache.set(chatId, messages);
    } else {
      messages = [];
    }
  }

  return messages;
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
