import Anthropic from '@anthropic-ai/sdk';

// Environment variables
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

if (!anthropicApiKey) {
  throw new Error('Missing ANTHROPIC_API_KEY environment variable');
}

// Create Anthropic client
export const anthropic = new Anthropic({
  apiKey: anthropicApiKey,
});

// Default model to use
export const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';

// Maximum tokens for responses
export const MAX_TOKENS = 1024;
