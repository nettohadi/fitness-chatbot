import Anthropic from '@anthropic-ai/sdk';

// Environment variables
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

// Create Anthropic client with explicit type
// Will throw error at runtime if API key is not set
export const anthropic: Anthropic = new Anthropic({
  apiKey: anthropicApiKey || 'sk-ant-placeholder',
});

// Default model to use
export const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';

// Maximum tokens for responses
export const MAX_TOKENS = 1024;
