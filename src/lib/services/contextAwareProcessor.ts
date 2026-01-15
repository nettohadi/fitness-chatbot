import { GoogleGenerativeAI } from '@google/generative-ai';
import type { CachedMessage } from '@/lib/cache/conversationCache';
import type { User } from '@/types';
import { logClaudeApiCall } from '@/lib/utils/apiLogger';

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// Model configuration - Gemini 2.0 Flash is the cheapest
const MODEL_ID = 'gemini-2.0-flash';

// Pricing per 1M tokens (for cost calculation)
// Gemini 2.0 Flash: $0.10 input, $0.40 output per 1M tokens
const PRICING = {
  input: 0.10,
  output: 0.40,
};

/**
 * Process user message with conversation context using Gemini AI
 *
 * This is the core function that makes the bot context-aware and multilingual.
 * Gemini automatically:
 * - Detects and responds in the user's language
 * - Understands conversation flow from history
 * - Asks for clarification when needed
 * - Requests confirmation before saving
 * - Guides profile setup for new users
 */
export async function processWithContext(
  userMessage: string,
  conversationHistory: CachedMessage[],
  user: User,
  todaySummary?: string,
  todayExercises?: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt(user, todaySummary, todayExercises);

  // Get the Gemini model with system instruction
  const model = genAI.getGenerativeModel({
    model: MODEL_ID,
    systemInstruction: systemPrompt,
  });

  // Convert conversation history to Gemini format
  const history = conversationHistory.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model' as const,
    parts: [{ text: m.content }],
  }));

  try {
    const startTime = Date.now();

    // Start a chat session with history
    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: 1024,
      },
    });

    // Send the current message
    const result = await chat.sendMessage(userMessage);
    const response = result.response;

    const latencyMs = Date.now() - startTime;

    // Extract text from response
    let responseText = response.text() || '';

    if (!responseText) {
      responseText = 'Sorry, I could not process that.';
    }

    console.log({ response: responseText.substring(0, 200) });

    // Get token usage from response metadata
    const usageMetadata = response.usageMetadata;
    const inputTokens = usageMetadata?.promptTokenCount || 0;
    const outputTokens = usageMetadata?.candidatesTokenCount || 0;
    const totalCost = (inputTokens * PRICING.input + outputTokens * PRICING.output) / 1_000_000;

    // Log API call to database (async, non-blocking)
    const logMessages = conversationHistory.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    logMessages.push({ role: 'user', content: userMessage });

    logClaudeApiCall({
      userId: user.id,
      model: MODEL_ID,
      systemPrompt,
      messages: logMessages,
      response: responseText,
      inputTokens,
      outputTokens,
      latencyMs,
      totalCost,
    }).catch((err) => console.error('Failed to log API call:', err));

    return responseText;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

/**
 * Build system prompt with user context and rules
 */
function buildSystemPrompt(user: User, todaySummary?: string, todayExercises?: string): string {
  return `You are a friendly calorie tracking assistant for Telegram. Be conversational, not robotic.

## CORE RULES

### Language
- ALWAYS respond in the user's language (Indonesian, English, etc.)
- Match their style: casual ("gw makan nasi") → casual response; formal → formal response
- Use "**" for bold in markdown

### Profile Setup (if profileCompleted: false)
Guide new users through setup ONE question at a time:
1. Name → 2. Age → 3. Gender → 4. Weight (kg) → 5. Height (cm) → 6. Activity level → 7. Deficit target (optional)

When complete, respond with:
\`\`\`json
{
  "action": "save_profile",
  "data": {
    "fullName": "John Smith",
    "nickname": "John",
    "age": 37,
    "gender": "male",
    "weightKg": 76,
    "heightCm": 165,
    "activityLevel": "sedentary",
    "deficitTarget": 500
  },
  "userMessage": "Your friendly confirmation message here"
}
\`\`\`

To update individual fields later, use "update_profile" action.

### Food Logging
- Ask for amounts if vague ("I ate rice" → "How much?")
- Use average of calorie ranges when estimating
- For multiple foods, estimate each separately
- If user provides calories, use their value (estimatedByAi: false)
- If you estimate, set estimatedByAi: true
- ALWAYS ask for confirmation before saving

When user confirms:
\`\`\`json
{
  "action": "save_calories",
  "data": {
    "items": [
      { "foodDescription": "Rice", "calories": 200, "estimatedByAi": true },
      { "foodDescription": "Chicken", "calories": 250, "estimatedByAi": true }
    ]
  },
  "userMessage": "Saved! Rice 200 + Chicken 250 = 450 kcal total"
}
\`\`\`

For updates: "update_calories" with entryId and updates object
For deletes: "delete_calories" with entryId

### Exercise Logging
When user mentions exercise:
1. Identify exercise type and duration
2. Use your knowledge of MET (Metabolic Equivalent) values to estimate calories burned
3. Formula: **Calories = MET × Weight(kg) × (Duration in minutes ÷ 60)**
4. Round to nearest whole number
5. Ask for confirmation before saving

Common MET reference (use your judgment for unlisted exercises):
- Walking: ~3.5 | Running: ~8-10 | Cycling: ~6-8 | Swimming: ~8
- Gym/weights: ~3.5 | HIIT: ~8 | Yoga: ~2.5 | Sports: ~5-8

**IMPORTANT**:
- Use simple English exercise type names in JSON (e.g., "cycling" not "sepeda statis")
- Don't show calculation steps to user, just the result
- Include metValue in your estimate

When user confirms:
\`\`\`json
{
  "action": "save_exercise",
  "data": {
    "exerciseType": "cycling",
    "durationMinutes": 30,
    "caloriesBurned": 258,
    "metValue": 6.8
  },
  "userMessage": "Logged! 30 min cycling burned 258 kcal"
}
\`\`\`

For updates: "update_exercise" with exerciseId and updates
For deletes: "delete_exercise" with exerciseId
For splits: "replace_exercise" with exerciseId and newEntries array

### Summaries & Queries
**Today's summary**: Use data from TODAY'S FOOD LOG and TODAY'S EXERCISES below.
Calculate: Eating Target = TDEE - Deficit Target + Exercise Burned

\`\`\`json
{
  "action": "query_summary",
  "data": { "type": "today" },
  "userMessage": "Your complete summary with food list, exercise, totals, and remaining calories"
}
\`\`\`

**Historical queries** (yesterday, week, month): Use query_summary with appropriate type. Server will fetch data.

Query types:
- "today" - current day
- "yesterday" - previous day
- "week" - this week
- "month" - this month
- "last_n_days" - include "days": N
- "date_range" - include "startDate" and "endDate" (YYYY-MM-DD)

### Confirmation Flow
- Never save without explicit confirmation ("yes", "ya", "ok")
- If user says "no"/"tidak", cancel and acknowledge

## USER PROFILE:
${buildUserProfileInfo(user)}

${todaySummary ? `## TODAY'S FOOD LOG:\n${todaySummary}\n` : ''}
${todayExercises ? `## TODAY'S EXERCISES:\n${todayExercises}\n` : ''}

## STYLE TIPS
- Be conversational, not template-y
- Celebrate wins, encourage on tough days
- Be concise for quick questions, detailed when asked
- Use kcal (not cal) for values`;
}

/**
 * Build user profile information section
 */
function buildUserProfileInfo(user: User): string {
  const info: string[] = [];

  // Add name information if available
  if (user.fullName || user.nickname) {
    const displayName = user.nickname || user.fullName;
    info.push(`- User Name: ${displayName}`);
    info.push(`**IMPORTANT: Address this user as "${displayName}" in your responses to make it personal and friendly!**`);
  }

  info.push(`- Profile Completed: ${user.profileCompleted ? 'Yes' : 'No ⚠️'}`);

  if (user.age) info.push(`- Age: ${user.age} years`);
  if (user.gender) info.push(`- Gender: ${user.gender}`);
  if (user.weightKg) info.push(`- Weight: ${user.weightKg} kg`);
  if (user.heightCm) info.push(`- Height: ${user.heightCm} cm`);
  if (user.activityLevel) info.push(`- Activity Level: ${user.activityLevel}`);
  if (user.bmr) info.push(`- BMR: ${Math.round(user.bmr.toNumber())} cal/day`);
  if (user.tdee) info.push(`- TDEE: ${Math.round(user.tdee.toNumber())} cal/day`);
  if (user.dailyCalorieGoal) {
    info.push(`- Daily Calorie Goal: ${Math.round(user.dailyCalorieGoal.toNumber())} cal`);
  }
  if (user.deficitTarget) {
    info.push(`- Deficit Target: ${Math.round(user.deficitTarget.toNumber())} cal/day`);
  }

  return info.join('\n');
}

/**
 * Estimate calories for food using AI
 * (Fallback for when context processor doesn't provide estimate)
 */
export async function estimateCalories(
  foodDescription: string,
  userContext?: string
): Promise<{ calories: number; confidence: string; reasoning: string }> {
  const prompt = `Estimate the calories for: "${foodDescription}"

${userContext ? `Context: ${userContext}` : ''}

Provide your estimate in this exact format:
Calories: [number]
Confidence: [high/medium/low]
Reasoning: [brief explanation]`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_ID });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (!text) {
      throw new Error('No text response from AI');
    }

    // Parse response
    const caloriesMatch = text.match(/Calories:\s*(\d+)/i);
    const confidenceMatch = text.match(/Confidence:\s*(high|medium|low)/i);
    const reasoningMatch = text.match(/Reasoning:\s*(.+)/i);

    return {
      calories: caloriesMatch ? parseInt(caloriesMatch[1]) : 0,
      confidence: confidenceMatch ? confidenceMatch[1] : 'low',
      reasoning: reasoningMatch ? reasoningMatch[1].trim() : '',
    };
  } catch (error) {
    console.error('Error estimating calories:', error);
    throw error;
  }
}
