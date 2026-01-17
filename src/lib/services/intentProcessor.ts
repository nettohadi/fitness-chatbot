/**
 * Intent Processor Service
 * Handles intent detection and routing to specialized prompts
 */

import OpenAI from 'openai';
import { logClaudeApiCall } from '@/lib/utils/apiLogger';
import type { CachedMessage } from '@/lib/cache/conversationCache';
import {
  buildIntentDetectorPrompt,
  buildConversationPrompt,
  buildFoodClarificationPrompt,
  buildFoodEstimatorPrompt,
  buildFoodLoggerPrompt,
  buildFoodUpdatePrompt,
  buildExerciseClarificationPrompt,
  buildExerciseEstimatorPrompt,
  buildExerciseLoggerPrompt,
  buildExerciseUpdatePrompt,
  buildSummaryPrompt,
  buildSummaryPeriodExtractorPrompt,
  buildProfileSetupPrompt,
  buildProfileUpdatePrompt,
  type PromptUser,
  type IntentResult,
  type SummaryData,
  type Language,
} from '@/lib/prompts';

// Use OpenRouter for LLM calls
const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Model configuration from environment variable
// Default: Gemini 2.0 Flash (cheap and fast)
// Alternatives: 'openai/gpt-4o-mini', 'anthropic/claude-3.5-haiku', 'meta-llama/llama-3.1-8b-instruct'
const MODEL_ID = process.env.LLM_MODEL_ID || 'google/gemini-2.0-flash-001';

// Pricing per 1M tokens (for cost calculation) - update when changing models
// Gemini 2.0 Flash: input $0.10, output $0.40
// GPT-4o mini: input $0.15, output $0.60
// Claude 3.5 Haiku: input $0.80, output $4.00
const PRICING = {
  input: parseFloat(process.env.LLM_PRICING_INPUT || '0.10'),
  output: parseFloat(process.env.LLM_PRICING_OUTPUT || '0.40'),
};

/**
 * Call LLM with system prompt and conversation history
 * @param temperature - Lower = more deterministic (good for calculations), default 0.7
 */
async function callLLM(
  systemPrompt: string,
  userMessage: string,
  history: CachedMessage[],
  userId: string,
  maxTokens: number = 512,
  temperature: number = 0.7
): Promise<string> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const startTime = Date.now();

  const response = await openrouter.chat.completions.create({
    model: MODEL_ID,
    max_tokens: maxTokens,
    temperature,
    messages,
  });

  const latencyMs = Date.now() - startTime;
  const responseText = response.choices[0]?.message?.content || '';

  // Calculate tokens and cost
  const inputTokens = response.usage?.prompt_tokens || 0;
  const outputTokens = response.usage?.completion_tokens || 0;
  const totalCost = (inputTokens * PRICING.input + outputTokens * PRICING.output) / 1_000_000;

  // Log API call (async, non-blocking)
  logClaudeApiCall({
    userId,
    model: response.model || MODEL_ID,
    systemPrompt,
    messages: messages.slice(1), // Remove system message
    response: responseText,
    inputTokens,
    outputTokens,
    latencyMs,
    totalCost,
  }).catch((err) => console.error('Failed to log API call:', err));

  return responseText;
}

/**
 * Parse JSON from LLM response (handles markdown code blocks)
 */
function parseJSON<T>(response: string): T | null {
  try {
    // Try to extract JSON from markdown code block
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }

    // Try to parse raw JSON
    const trimmed = response.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return JSON.parse(trimmed);
    }

    return null;
  } catch (error) {
    console.error('Failed to parse JSON from response:', error);
    console.error('Response was:', response.substring(0, 500));
    return null;
  }
}

/**
 * Detect user intent from message
 */
export async function detectIntent(
  message: string,
  user: PromptUser,
  history: CachedMessage[]
): Promise<IntentResult> {
  const systemPrompt = buildIntentDetectorPrompt();

  const response = await callLLM(systemPrompt, message, history, user.id, 256);
  const result = parseJSON<IntentResult>(response);

  if (!result || !result.intent) {
    // Default to conversation if parsing fails
    return { intent: 'conversation', language: 'id' };
  }

  // Ensure language is always present
  if (!result.language) {
    result.language = 'id';
  }

  return result;
}

/**
 * Process conversation intent - greetings, out-of-scope, general chat
 */
export async function processConversation(
  message: string,
  user: PromptUser,
  history: CachedMessage[],
  language: Language
): Promise<string> {
  const systemPrompt = buildConversationPrompt(user, language);
  const response = await callLLM(systemPrompt, message, history, user.id, 256);
  return response;
}

/**
 * Process food clarification - user mentioned food but no quantity
 */
export async function processFoodClarification(
  message: string,
  userId: string,
  history: CachedMessage[],
  language: Language
): Promise<string> {
  const systemPrompt = buildFoodClarificationPrompt(language);
  const response = await callLLM(systemPrompt, message, history, userId, 128);
  return response;
}

/**
 * Process exercise clarification - user mentioned exercise but no duration
 */
export async function processExerciseClarification(
  message: string,
  userId: string,
  history: CachedMessage[],
  language: Language
): Promise<string> {
  const systemPrompt = buildExerciseClarificationPrompt(language);
  const response = await callLLM(systemPrompt, message, history, userId, 128);
  return response;
}

/**
 * Pending food type for tracking food estimates
 */
export interface PendingFood {
  items: Array<{ food: string; calories: number; portion?: string }>;
  timestamp: number;
}

/**
 * Pending exercise type for tracking exercise estimates
 */
export interface PendingExercise {
  exerciseType: string;
  durationMinutes: number;
  caloriesBurned: number;
  metValue: number;
  timestamp: number;
}

/**
 * Food estimate item
 */
export interface FoodEstimateItem {
  food: string;
  calories: number;
  portion?: string;
}

/**
 * Food estimate result
 */
export interface FoodEstimateResult {
  estimate?: {
    items: FoodEstimateItem[];
    timestamp: number;
  };
  message: string;
}

/**
 * Process food estimate - user mentioned food they ate
 * Uses low temperature (0.3) for more accurate calculations
 */
export async function processFoodEstimate(
  message: string,
  user: PromptUser,
  history: CachedMessage[]
): Promise<FoodEstimateResult> {
  const systemPrompt = buildFoodEstimatorPrompt(user);
  // Low temperature for accurate calorie calculations
  const response = await callLLM(systemPrompt, message, history, user.id, 512, 0.3);
  const result = parseJSON<{ estimate: { items: FoodEstimateItem[] }; message: string }>(response);

  if (result && result.estimate) {
    return {
      estimate: {
        items: result.estimate.items,
        timestamp: Date.now(),
      },
      message: result.message,
    };
  }

  // Return raw response if parsing fails
  return { message: response };
}

/**
 * Food logging result with success and failure messages
 */
export interface FoodLoggingResult {
  action: 'save_calories';
  data: {
    items: Array<{
      foodDescription: string;
      calories: number;
      estimatedByAi: boolean;
    }>;
  };
  successMessage: string;
  failureMessage: string;
}

/**
 * Process food logging - user confirmed saving food
 * Uses LLM to extract food details from conversation history
 */
export async function processFoodLogging(
  message: string,
  user: PromptUser,
  history: CachedMessage[],
  todayCalories: number
): Promise<FoodLoggingResult | { message: string }> {
  const systemPrompt = buildFoodLoggerPrompt(user, todayCalories);
  const response = await callLLM(systemPrompt, message, history, user.id, 512);
  const result = parseJSON<FoodLoggingResult>(response);

  if (result && result.action === 'save_calories' && result.data?.items) {
    return result;
  }

  return { message: response };
}

/**
 * Process food update - user wants to update/delete food entry
 */
export async function processFoodUpdate(
  message: string,
  user: PromptUser,
  history: CachedMessage[],
  todayFood: Array<{ id: string; food: string; calories: number; time: string }>
): Promise<{ action?: string; data?: any; message: string }> {
  const systemPrompt = buildFoodUpdatePrompt(user, todayFood);
  const response = await callLLM(systemPrompt, message, history, user.id, 512);
  const result = parseJSON<{ action?: string; data?: any; message: string }>(response);

  return result || { message: response };
}

/**
 * Process exercise estimate - user mentioned exercise they did
 * Uses low temperature (0.3) for more accurate calculations
 */
export async function processExerciseEstimate(
  message: string,
  user: PromptUser,
  history: CachedMessage[]
): Promise<{ estimate?: PendingExercise; message: string }> {
  const systemPrompt = buildExerciseEstimatorPrompt(user);
  // Low temperature for accurate calorie calculations
  const response = await callLLM(systemPrompt, message, history, user.id, 512, 0.3);
  const result = parseJSON<{ estimate: { exerciseType: string; durationMinutes: number; caloriesBurned: number; metValue: number }; message: string }>(response);

  if (result && result.estimate) {
    return {
      estimate: {
        ...result.estimate,
        timestamp: Date.now(),
      },
      message: result.message,
    };
  }

  return { message: response };
}

/**
 * Single exercise entry
 */
export interface ExerciseEntry {
  exerciseType: string;
  durationMinutes: number;
  caloriesBurned: number;
  metValue: number;
}

/**
 * Exercise logging result with success and failure messages
 * Supports both single and multiple exercise entries
 */
export interface ExerciseLoggingResult {
  action: 'save_exercise' | 'save_multiple_exercises';
  data: {
    exerciseType?: string;
    durationMinutes?: number;
    caloriesBurned?: number;
    metValue?: number;
    entries?: ExerciseEntry[]; // For multiple exercises with different intensities
  };
  successMessage: string;
  failureMessage: string;
}

/**
 * Process exercise logging - user confirmed saving exercise
 * Uses LLM to extract exercise details from conversation history
 * Supports multiple entries when different intensities are involved
 */
export async function processExerciseLogging(
  message: string,
  user: PromptUser,
  history: CachedMessage[],
  todayBurned: number
): Promise<ExerciseLoggingResult | { message: string }> {
  const systemPrompt = buildExerciseLoggerPrompt(user, todayBurned);
  const response = await callLLM(systemPrompt, message, history, user.id, 512);
  const result = parseJSON<ExerciseLoggingResult>(response);

  // Support both single exercise and multiple exercises
  if (result && (result.action === 'save_exercise' || result.action === 'save_multiple_exercises') && result.data) {
    return result;
  }

  return { message: response };
}

/**
 * Process exercise update - user wants to update/delete exercise entry
 */
export async function processExerciseUpdate(
  message: string,
  user: PromptUser,
  history: CachedMessage[],
  todayExercises: Array<{ id: string; type: string; duration: number; calories: number; time: string }>
): Promise<{ action?: string; data?: any; message: string }> {
  const systemPrompt = buildExerciseUpdatePrompt(user, todayExercises);
  const response = await callLLM(systemPrompt, message, history, user.id, 512);
  const result = parseJSON<{ action?: string; data?: any; message: string }>(response);

  return result || { message: response };
}

/**
 * Summary period result from period extraction
 */
export interface SummaryPeriodResult {
  period: 'today' | 'yesterday' | 'week' | 'month' | 'specific';
  date?: string; // YYYY-MM-DD format for specific dates
}

/**
 * Extract summary period from user message
 * Uses LLM to parse period (today, yesterday, week, month, or specific date)
 */
export async function extractSummaryPeriod(
  message: string,
  userId: string
): Promise<SummaryPeriodResult> {
  const systemPrompt = buildSummaryPeriodExtractorPrompt();
  // Use low tokens since this is a simple extraction, no history needed
  const response = await callLLM(systemPrompt, message, [], userId, 128, 0.3);
  const result = parseJSON<SummaryPeriodResult>(response);

  if (result && result.period) {
    return result;
  }

  // Default to today if parsing fails
  return { period: 'today' };
}

/**
 * Process summary request - user asks about calories/history
 */
export async function processSummary(
  message: string,
  user: PromptUser,
  history: CachedMessage[],
  summaryData: SummaryData
): Promise<string> {
  const systemPrompt = buildSummaryPrompt(user, summaryData);
  const response = await callLLM(systemPrompt, message, history, user.id, 1024);

  // Summary returns plain text, no JSON parsing needed
  return response;
}

/**
 * Process profile setup - onboarding new users
 */
export async function processProfileSetup(
  message: string,
  user: PromptUser,
  history: CachedMessage[]
): Promise<{ action?: string; data?: any; message: string }> {
  const systemPrompt = buildProfileSetupPrompt(user);
  const response = await callLLM(systemPrompt, message, history, user.id, 512);
  const result = parseJSON<{ action?: string; data?: any; message: string }>(response);

  return result || { message: response };
}

/**
 * Process profile update - user wants to update profile
 */
export async function processProfileUpdate(
  message: string,
  user: PromptUser,
  history: CachedMessage[]
): Promise<{ action?: string; data?: any; message: string }> {
  const systemPrompt = buildProfileUpdatePrompt(user);
  const response = await callLLM(systemPrompt, message, history, user.id, 512);
  const result = parseJSON<{ action?: string; data?: any; message: string }>(response);

  return result || { message: response };
}

/**
 * Convert database User to PromptUser (simplifies Decimal fields to numbers)
 */
export function toPromptUser(user: any): PromptUser {
  return {
    id: user.id,
    phoneNumber: user.phoneNumber,
    fullName: user.fullName,
    nickname: user.nickname,
    age: user.age,
    gender: user.gender,
    weightKg: user.weightKg?.toNumber ? user.weightKg.toNumber() : user.weightKg,
    heightCm: user.heightCm?.toNumber ? user.heightCm.toNumber() : user.heightCm,
    activityLevel: user.activityLevel,
    bmr: user.bmr?.toNumber ? user.bmr.toNumber() : user.bmr,
    tdee: user.tdee?.toNumber ? user.tdee.toNumber() : user.tdee,
    dailyCalorieGoal: user.dailyCalorieGoal?.toNumber ? user.dailyCalorieGoal.toNumber() : user.dailyCalorieGoal,
    deficitTarget: user.deficitTarget?.toNumber ? user.deficitTarget.toNumber() : user.deficitTarget,
    profileCompleted: user.profileCompleted,
    preferredLanguage: user.preferredLanguage,
  };
}

/**
 * Extract hidden ESTIMATE data from message
 * Format: <!--ESTIMATE:{"estimate":{...}}-->
 */
function extractEstimateFromMessage(content: string): any | null {
  const match = content.match(/<!--ESTIMATE:(.*?)-->/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Extract pending food from conversation history
 * Looks for the last food estimate that hasn't been saved
 */
export function extractPendingFood(history: CachedMessage[]): PendingFood | null {
  // Look through history backwards for the last food estimate
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.role === 'assistant') {
      // Try to extract from hidden ESTIMATE tag first
      const hidden = extractEstimateFromMessage(msg.content);
      if (hidden?.estimate?.items) {
        return {
          items: hidden.estimate.items,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.getTime() : Date.now(),
        };
      }

      // Fallback: try to parse raw JSON from message
      const parsed = parseJSON<{ estimate?: { items: Array<{ food: string; calories: number; portion?: string }> } }>(msg.content);
      if (parsed?.estimate?.items) {
        return {
          items: parsed.estimate.items,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.getTime() : Date.now(),
        };
      }
    }
  }
  return null;
}

/**
 * Extract pending exercise from conversation history
 * Looks for the last exercise estimate that hasn't been saved
 */
export function extractPendingExercise(history: CachedMessage[]): PendingExercise | null {
  // Look through history backwards for the last exercise estimate
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.role === 'assistant') {
      // Try to extract from hidden ESTIMATE tag first
      const hidden = extractEstimateFromMessage(msg.content);
      if (hidden?.estimate?.exerciseType) {
        return {
          ...hidden.estimate,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.getTime() : Date.now(),
        };
      }

      // Fallback: try to parse raw JSON from message
      const parsed = parseJSON<{ estimate?: { exerciseType: string; durationMinutes: number; caloriesBurned: number; metValue: number } }>(msg.content);
      if (parsed?.estimate) {
        return {
          ...parsed.estimate,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.getTime() : Date.now(),
        };
      }
    }
  }
  return null;
}
