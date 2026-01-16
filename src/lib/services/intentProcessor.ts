/**
 * Intent Processor Service
 * Handles intent detection and routing to specialized prompts
 */

import OpenAI from 'openai';
import { logClaudeApiCall } from '@/lib/utils/apiLogger';
import type { CachedMessage } from '@/lib/cache/conversationCache';
import {
  buildIntentDetectorPrompt,
  buildFoodEstimatorPrompt,
  buildFoodUpdatePrompt,
  buildExerciseEstimatorPrompt,
  buildExerciseUpdatePrompt,
  buildSummaryPrompt,
  buildProfileSetupPrompt,
  buildProfileUpdatePrompt,
  // Programmatic action generators (no LLM needed)
  generateFoodSaveAction,
  generateExerciseSaveAction,
  type PromptUser,
  type IntentResult,
  type PendingFood,
  type PendingExercise,
  type SummaryData,
  type FoodLoggerResult,
  type ExerciseLoggerResult,
} from '@/lib/prompts';

// Use OpenRouter for Gemini
const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Model configuration - Gemini 2.0 Flash via OpenRouter (cheap and fast)
const MODEL_ID = 'google/gemini-2.0-flash-001';

// Pricing per 1M tokens (for cost calculation)
const PRICING = {
  input: 0.10,
  output: 0.40,
};

/**
 * Call LLM with system prompt and conversation history
 */
async function callLLM(
  systemPrompt: string,
  userMessage: string,
  history: CachedMessage[],
  userId: string,
  maxTokens: number = 512
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
    return { intent: 'conversation', message: response };
  }

  return result;
}

/**
 * Process food estimate - user mentioned food they ate
 */
export async function processFoodEstimate(
  message: string,
  user: PromptUser,
  history: CachedMessage[]
): Promise<{ estimate?: PendingFood; message: string }> {
  const systemPrompt = buildFoodEstimatorPrompt(user);
  const response = await callLLM(systemPrompt, message, history, user.id, 512);
  const result = parseJSON<{ estimate: { items: Array<{ food: string; calories: number; portion?: string }> }; message: string }>(response);

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
 * Process food logging - user confirmed saving food
 * NO LLM CALL NEEDED - we already have pending food from estimate
 */
export function processFoodLogging(
  user: PromptUser,
  pendingFood: PendingFood,
  todayCalories: number
): FoodLoggerResult {
  return generateFoodSaveAction(user, pendingFood, todayCalories);
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
 */
export async function processExerciseEstimate(
  message: string,
  user: PromptUser,
  history: CachedMessage[]
): Promise<{ estimate?: PendingExercise; message: string }> {
  const systemPrompt = buildExerciseEstimatorPrompt(user);
  const response = await callLLM(systemPrompt, message, history, user.id, 512);
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
 * Process exercise logging - user confirmed saving exercise
 * NO LLM CALL NEEDED - we already have pending exercise from estimate
 */
export function processExerciseLogging(
  pendingExercise: PendingExercise,
  todayBurned: number
): ExerciseLoggerResult {
  return generateExerciseSaveAction(pendingExercise, todayBurned);
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
 * Extract pending food from conversation history
 * Looks for the last food estimate that hasn't been saved
 */
export function extractPendingFood(history: CachedMessage[]): PendingFood | null {
  // Look through history backwards for the last food estimate
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.role === 'assistant') {
      // Try to parse estimate from assistant message
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
      // Try to parse estimate from assistant message
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
