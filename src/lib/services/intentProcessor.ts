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
 * Operation types for field validation
 */
type OperationType = 'food_logging' | 'food_update' | 'exercise_logging' | 'exercise_update' | 'profile_update';

/**
 * Field validation configurations for different operation types
 */
const VALID_FIELDS_CONFIG: Record<OperationType, { dataFields: Set<string>; nestedFields?: Set<string> }> = {
  food_logging: {
    dataFields: new Set(['items']),
    nestedFields: new Set(['foodDescription', 'calories', 'estimatedByAi']),
  },
  food_update: {
    dataFields: new Set(['entryId', 'updates']),
    nestedFields: new Set(['calories', 'foodDescription']),
  },
  exercise_logging: {
    dataFields: new Set(['exerciseType', 'durationMinutes', 'caloriesBurned', 'metValue', 'userProvidedCalories', 'entries']),
    nestedFields: new Set(['exerciseType', 'durationMinutes', 'caloriesBurned', 'metValue']),
  },
  exercise_update: {
    dataFields: new Set(['exerciseId', 'updates']),
    nestedFields: new Set(['durationMinutes', 'caloriesBurned', 'exerciseType', 'metValue']),
  },
  profile_update: {
    dataFields: new Set(['nickname', 'fullName', 'age', 'gender', 'weightKg', 'heightCm', 'activityLevel', 'deficitTarget']),
  },
};

/**
 * Validate fields in an object against allowed fields
 * Returns array of invalid field names
 */
function findInvalidFields(data: Record<string, unknown>, validFields: Set<string>): string[] {
  const invalid: string[] = [];
  for (const key of Object.keys(data)) {
    if (!validFields.has(key)) {
      invalid.push(key);
    }
  }
  return invalid;
}

/**
 * Validate operation-specific fields in the data object
 * Returns invalid fields if any, or empty array if valid
 */
function validateOperationFields(operationType: OperationType, data: Record<string, unknown>): string[] {
  const config = VALID_FIELDS_CONFIG[operationType];
  if (!config) return [];

  const invalidFields: string[] = [];

  // Check top-level data fields
  invalidFields.push(...findInvalidFields(data, config.dataFields));

  // Check nested fields based on operation type
  if (config.nestedFields) {
    if (operationType === 'food_logging' && Array.isArray(data.items)) {
      for (const item of data.items as Record<string, unknown>[]) {
        const itemInvalid = findInvalidFields(item, config.nestedFields);
        invalidFields.push(...itemInvalid.map(f => `items[].${f}`));
      }
    }

    if ((operationType === 'food_update' || operationType === 'exercise_update') && data.updates) {
      const updatesInvalid = findInvalidFields(data.updates as Record<string, unknown>, config.nestedFields);
      invalidFields.push(...updatesInvalid.map(f => `updates.${f}`));
    }

    if (operationType === 'exercise_logging' && Array.isArray(data.entries)) {
      for (const entry of data.entries as Record<string, unknown>[]) {
        const entryInvalid = findInvalidFields(entry, config.nestedFields);
        invalidFields.push(...entryInvalid.map(f => `entries[].${f}`));
      }
    }
  }

  return invalidFields;
}

/**
 * Call LLM expecting JSON output with automatic retry on parse failure or invalid fields
 * Retries once with stricter instructions and zero temperature if first attempt fails
 */
async function callLLMForJSON<T>(
  systemPrompt: string,
  userMessage: string,
  history: CachedMessage[],
  userId: string,
  maxTokens: number = 512,
  temperature: number = 0.3,
  validator?: (result: T) => boolean,
  operationType?: OperationType
): Promise<{ result: T | null; rawResponse: string }> {
  // First attempt
  const response = await callLLM(systemPrompt, userMessage, history, userId, maxTokens, temperature);
  let result = parseJSON<T>(response);

  // Check if result is valid (basic check or custom validator)
  let isValid = result !== null && (validator ? validator(result) : true);

  // If valid JSON but has invalid fields, mark as invalid for retry
  let invalidFields: string[] = [];
  if (isValid && operationType && result && (result as any).data) {
    invalidFields = validateOperationFields(operationType, (result as any).data);
    if (invalidFields.length > 0) {
      console.warn(`[LLM-JSON] Invalid fields detected: ${invalidFields.join(', ')}`);
      isValid = false;
    }
  }

  if (isValid) {
    return { result, rawResponse: response };
  }

  // Retry with stricter instructions
  console.warn('[LLM-JSON] First attempt failed, retrying with stricter prompt...');
  console.warn('[LLM-JSON] Failed response:', response.substring(0, 200));

  let retryPrompt = systemPrompt + `

⚠️ RETRY - YOUR PREVIOUS RESPONSE WAS INVALID
You MUST output ONLY a valid JSON object. No text, no explanation.
Start your response with { and end with }`;

  // Add field-specific correction if we detected invalid fields
  if (invalidFields.length > 0 && operationType) {
    const validFieldsList = Array.from(VALID_FIELDS_CONFIG[operationType].dataFields).join(', ');
    retryPrompt += `

FIELD ERROR: You used invalid field names: ${invalidFields.join(', ')}
You MUST use ONLY these field names in data: ${validFieldsList}`;
  }

  const retryResponse = await callLLM(retryPrompt, userMessage, history, userId, maxTokens, 0);
  result = parseJSON<T>(retryResponse);

  if (result !== null && (validator ? validator(result) : true)) {
    // Check fields again on retry
    if (operationType && (result as any).data) {
      const retryInvalidFields = validateOperationFields(operationType, (result as any).data);
      if (retryInvalidFields.length > 0) {
        console.error(`[LLM-JSON] Retry still has invalid fields: ${retryInvalidFields.join(', ')}`);
        // Return result but log warning - the DB layer will filter invalid fields
      }
    }
    console.log('[LLM-JSON] Retry succeeded');
    return { result, rawResponse: retryResponse };
  }

  console.error('[LLM-JSON] Retry also failed, returning null');
  console.error('[LLM-JSON] Retry response:', retryResponse.substring(0, 200));

  return { result: null, rawResponse: retryResponse };
}

/**
 * Parse JSON from LLM response
 * Handles: markdown code blocks, raw JSON, JSON with surrounding text
 */
function parseJSON<T>(response: string): T | null {
  try {
    // 1. Try to extract JSON from markdown code block
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }

    // 2. Try to parse raw JSON (response starts with { or [)
    const trimmed = response.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      // Find the end of the JSON object/array
      let depth = 0;
      let inString = false;
      let escaped = false;
      let endIndex = 0;

      for (let i = 0; i < trimmed.length; i++) {
        const char = trimmed[i];

        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === '\\' && inString) {
          escaped = true;
          continue;
        }

        if (char === '"') {
          inString = !inString;
          continue;
        }

        if (!inString) {
          if (char === '{' || char === '[') depth++;
          if (char === '}' || char === ']') {
            depth--;
            if (depth === 0) {
              endIndex = i + 1;
              break;
            }
          }
        }
      }

      if (endIndex > 0) {
        return JSON.parse(trimmed.substring(0, endIndex));
      }
      return JSON.parse(trimmed);
    }

    // 3. Try to find JSON object anywhere in the response
    const objectMatch = response.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      // Parse only the first complete JSON object
      const jsonStr = objectMatch[0];
      let depth = 0;
      let inString = false;
      let escaped = false;
      let endIndex = 0;

      for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];

        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === '\\' && inString) {
          escaped = true;
          continue;
        }

        if (char === '"') {
          inString = !inString;
          continue;
        }

        if (!inString) {
          if (char === '{') depth++;
          if (char === '}') {
            depth--;
            if (depth === 0) {
              endIndex = i + 1;
              break;
            }
          }
        }
      }

      if (endIndex > 0) {
        return JSON.parse(jsonStr.substring(0, endIndex));
      }
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

  // Use callLLMForJSON with retry for reliable JSON output
  const { result } = await callLLMForJSON<IntentResult>(
    systemPrompt,
    message,
    history,
    user.id,
    256,
    0.1,
    // Validator: must have intent field
    (r) => !!r.intent
  );

  if (!result) {
    // Default to conversation if parsing fails after retry
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
 * Extract food names from user message using LLM
 * Returns array of food names for FatSecret lookup
 */
async function extractFoodNamesWithLLM(message: string, userId: string): Promise<string[]> {
  const prompt = `Extract ONLY the food/drink names from this message. Return JSON array of food names without quantities.
Example: "Saya makan nasi goreng 200gr dan ayam bakar 1 potong" -> ["nasi goreng", "ayam bakar"]
Example: "I had fried rice and orange juice" -> ["fried rice", "orange juice"]
Example: "makan indomie 2 bungkus" -> ["indomie"]

Message: "${message}"

Return ONLY a JSON array, nothing else:`;

  try {
    const response = await callLLM(prompt, '', [], userId, 128, 0);
    const parsed = parseJSON<string[]>(response);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (error) {
    console.error('[FoodExtract] LLM extraction failed:', error);
  }

  // Fallback: return the original message
  return [message];
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
  // Pre-fetch FatSecret data for consistent calorie estimation
  let fatSecretResult = null;
  try {
    const { getBestFoodMatch } = await import('./fatSecret');

    // Use LLM to extract food names from the message
    const foodNames = await extractFoodNamesWithLLM(message, user.id);
    console.log(`[FoodEstimate] Extracted food names: ${JSON.stringify(foodNames)} (from: "${message}")`);

    // Search FatSecret for the first food item (primary food)
    if (foodNames.length > 0) {
      fatSecretResult = await getBestFoodMatch(foodNames[0]);
      if (fatSecretResult) {
        console.log(`[FoodEstimate] FatSecret match: ${fatSecretResult.name} = ${fatSecretResult.caloriesPer100g || fatSecretResult.calories} kcal per ${fatSecretResult.caloriesPer100g ? '100g' : fatSecretResult.serving}`);
      } else {
        console.log(`[FoodEstimate] No FatSecret match for: ${foodNames[0]}`);
      }
    }
  } catch (error) {
    console.error('[FoodEstimate] FatSecret lookup failed:', error);
    // Continue without FatSecret data - LLM will estimate
  }

  const systemPrompt = buildFoodEstimatorPrompt(user, fatSecretResult);
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
  todayCalories: number,
  todayExercise: number = 0
): Promise<FoodLoggingResult | { message: string }> {
  const systemPrompt = buildFoodLoggerPrompt(user, todayCalories, todayExercise);

  // Use callLLMForJSON with retry for reliable JSON output and field validation
  const { result, rawResponse } = await callLLMForJSON<FoodLoggingResult>(
    systemPrompt,
    message,
    history,
    user.id,
    512,
    0.3,
    // Validator: must have action and items
    (r) => r.action === 'save_calories' && Array.isArray(r.data?.items) && r.data.items.length > 0,
    'food_logging' // Enable field validation for food logging
  );

  if (result) {
    return result;
  }

  return { message: rawResponse };
}

/**
 * Process food update - user wants to update/delete food entry
 * @param periodLabel - Label for the period (e.g., "hari ini", "kemarin", "2026-01-15")
 */
export async function processFoodUpdate(
  message: string,
  user: PromptUser,
  history: CachedMessage[],
  foodEntries: Array<{ id: string; food: string; calories: number; time: string }>,
  periodLabel: string = 'hari ini'
): Promise<{ action?: string; data?: any; message: string }> {
  const systemPrompt = buildFoodUpdatePrompt(user, foodEntries, periodLabel);

  // Use callLLMForJSON with retry for reliable JSON output and field validation
  const { result, rawResponse } = await callLLMForJSON<{ action?: string; data?: any; message: string }>(
    systemPrompt,
    message,
    history,
    user.id,
    512,
    0.3,
    // Validator: must have message field (action is optional for clarification responses)
    (r) => typeof r.message === 'string',
    'food_update' // Enable field validation for food update
  );

  return result || { message: rawResponse };
}

/**
 * Exercise estimate result
 */
export interface ExerciseEstimateResult {
  estimate?: {
    exerciseType: string;
    durationMinutes: number;
    caloriesBurned: number;
    metValue: number;
    timestamp: number;
  };
  message: string;
}

/**
 * Process exercise estimate - user mentioned exercise they did
 * LLM estimates calories burned (like food estimation)
 * Uses low temperature (0.3) for more accurate calculations
 */
export async function processExerciseEstimate(
  message: string,
  user: PromptUser,
  history: CachedMessage[]
): Promise<ExerciseEstimateResult> {
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

  // Return raw response if parsing fails
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

  // Use callLLMForJSON with retry for reliable JSON output and field validation
  const { result, rawResponse } = await callLLMForJSON<ExerciseLoggingResult>(
    systemPrompt,
    message,
    history,
    user.id,
    512,
    0.3,
    // Validator: must have valid action and data
    (r) => (r.action === 'save_exercise' || r.action === 'save_multiple_exercises') && !!r.data,
    'exercise_logging' // Enable field validation for exercise logging
  );

  if (result) {
    return result;
  }

  return { message: rawResponse };
}

/**
 * Process exercise update - user wants to update/delete exercise entry
 * @param periodLabel - Label for the period (e.g., "hari ini", "kemarin", "2026-01-15")
 */
export async function processExerciseUpdate(
  message: string,
  user: PromptUser,
  history: CachedMessage[],
  exerciseEntries: Array<{ id: string; type: string; duration: number; calories: number; time: string }>,
  periodLabel: string = 'hari ini'
): Promise<{ action?: string; data?: any; message: string }> {
  const systemPrompt = buildExerciseUpdatePrompt(user, exerciseEntries, periodLabel);

  // Use callLLMForJSON with retry for reliable JSON output and field validation
  const { result, rawResponse } = await callLLMForJSON<{ action?: string; data?: any; message: string }>(
    systemPrompt,
    message,
    history,
    user.id,
    512,
    0.3,
    // Validator: must have message field (action is optional for clarification responses)
    (r) => typeof r.message === 'string',
    'exercise_update' // Enable field validation for exercise update
  );

  return result || { message: rawResponse };
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
 * Valid field names for profile updates
 */
const VALID_PROFILE_FIELDS = new Set([
  'nickname', 'fullName', 'age', 'gender', 'weightKg', 'heightCm', 'activityLevel', 'deficitTarget'
]);

/**
 * Check if profile update data contains only valid fields
 */
function hasInvalidProfileFields(data: Record<string, unknown>): string[] {
  const invalidFields: string[] = [];
  for (const key of Object.keys(data)) {
    if (!VALID_PROFILE_FIELDS.has(key)) {
      invalidFields.push(key);
    }
  }
  return invalidFields;
}

/**
 * Process profile update - user wants to update profile
 * Includes retry logic if LLM returns invalid field names
 */
export async function processProfileUpdate(
  message: string,
  user: PromptUser,
  history: CachedMessage[]
): Promise<{ action?: string; data?: any; message?: string; successMessage?: string; failureMessage?: string }> {
  const systemPrompt = buildProfileUpdatePrompt(user);
  const response = await callLLM(systemPrompt, message, history, user.id, 512);
  const result = parseJSON<{ action?: string; data?: any; message?: string; successMessage?: string }>(response);

  if (!result) {
    return { message: response };
  }

  // If there's an action with data, check for invalid fields
  if (result.action && result.data) {
    const invalidFields = hasInvalidProfileFields(result.data);

    if (invalidFields.length > 0) {
      console.warn(`[PROFILE-UPDATE] Invalid fields detected: ${invalidFields.join(', ')}. Retrying...`);

      // Retry with a correction prompt
      const correctionPrompt = `${systemPrompt}

⚠️ CORRECTION REQUIRED - Your previous response used INVALID field names: ${invalidFields.join(', ')}
You MUST use ONLY these exact field names: nickname, fullName, age, gender, weightKg, heightCm, activityLevel, deficitTarget
Try again with the CORRECT field names.`;

      const retryResponse = await callLLM(correctionPrompt, message, history, user.id, 512);
      const retryResult = parseJSON<{ action?: string; data?: any; message?: string; successMessage?: string }>(retryResponse);

      if (retryResult) {
        // Check retry result for invalid fields
        if (retryResult.action && retryResult.data) {
          const retryInvalidFields = hasInvalidProfileFields(retryResult.data);
          if (retryInvalidFields.length > 0) {
            console.error(`[PROFILE-UPDATE] Retry still has invalid fields: ${retryInvalidFields.join(', ')}`);
            // Return message only, don't try to save with invalid fields
            return { message: retryResult.successMessage || retryResult.message || 'Unable to update profile. Please try again.' };
          }
        }
        return retryResult;
      }

      return { message: retryResponse };
    }
  }

  return result;
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
