import { anthropic, DEFAULT_MODEL, MAX_TOKENS } from '../claude';
import type { ClaudeCalorieEstimate } from '@/types';
import { z } from 'zod';

// Zod schema for validating Claude's response
const CalorieEstimateSchema = z.object({
  calories: z.number().min(0).max(10000),
  confidence: z.enum(['high', 'medium', 'low']),
  reasoning: z.string(),
});

/**
 * Estimate calories from a food description using Claude API
 * @param foodDescription - User's description of the food they ate
 * @returns ClaudeCalorieEstimate with calorie count, confidence, and reasoning
 */
export async function estimateCaloriesWithClaude(
  foodDescription: string
): Promise<ClaudeCalorieEstimate> {
  try {
    // Check if API key is set at runtime
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const prompt = buildCalorieEstimationPrompt(foodDescription);

    const message = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text content from the response
    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('');

    // Parse the JSON response
    const estimate = parseClaudeResponse(responseText);

    return estimate;
  } catch (error) {
    console.error('Error estimating calories with Claude:', error);

    // Return a fallback response
    return {
      calories: 0,
      confidence: 'low',
      reasoning:
        'Unable to estimate calories. Please try providing more details about the food, including portion size or weight.',
    };
  }
}

/**
 * Build the prompt for Claude API
 * @param foodDescription - User's food description
 * @returns Formatted prompt string
 */
function buildCalorieEstimationPrompt(foodDescription: string): string {
  return `You are a nutrition expert. Estimate the calories for this food item:

"${foodDescription}"

Respond with ONLY a JSON object in this exact format:
{
  "calories": <number>,
  "confidence": "high|medium|low",
  "reasoning": "<brief explanation>"
}

Guidelines:
- If the description includes a weight (e.g., "100g", "2 oz"), use that for accurate estimation
- If no weight is specified but quantity is mentioned (e.g., "2 slices"), estimate based on standard portions
- If the description is vague, provide a reasonable estimate and mark confidence as "low"
- If you cannot determine calories at all, set calories to 0 and explain why in reasoning
- Round calories to the nearest whole number
- Be concise in your reasoning (1-2 sentences)

Examples:
- "100g chicken breast" → {"calories": 165, "confidence": "high", "reasoning": "Grilled skinless chicken breast is typically 165 calories per 100g"}
- "2 slices of pizza" → {"calories": 570, "confidence": "medium", "reasoning": "Estimated 285 calories per slice based on average cheese pizza"}
- "some pasta" → {"calories": 200, "confidence": "low", "reasoning": "Without portion size, estimated a small serving of plain cooked pasta"}

Respond ONLY with the JSON object, no other text.`;
}

/**
 * Parse Claude's JSON response
 * @param responseText - Raw response text from Claude
 * @returns Parsed and validated ClaudeCalorieEstimate
 */
function parseClaudeResponse(responseText: string): ClaudeCalorieEstimate {
  try {
    // Try to extract JSON from the response
    // Sometimes Claude might include markdown code blocks
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : responseText;

    const parsed = JSON.parse(jsonString);

    // Validate with Zod schema
    const validated = CalorieEstimateSchema.parse(parsed);

    return validated;
  } catch (error) {
    console.error('Error parsing Claude response:', error);
    console.error('Response text:', responseText);

    // Fallback response
    return {
      calories: 0,
      confidence: 'low',
      reasoning: 'Unable to parse calorie estimate. Please try rephrasing your food description.',
    };
  }
}

/**
 * Format the calorie estimate for display
 * @param estimate - ClaudeCalorieEstimate object
 * @param foodDescription - Original food description
 * @returns Formatted string for user
 */
export function formatCalorieEstimate(
  estimate: ClaudeCalorieEstimate,
  foodDescription: string
): string {
  if (estimate.calories === 0) {
    return `❌ ${estimate.reasoning}`;
  }

  const confidenceEmoji = {
    high: '✅',
    medium: '⚠️',
    low: '❓',
  };

  return `${confidenceEmoji[estimate.confidence]} Estimated ~${estimate.calories} calories for "${foodDescription}"\n\n${estimate.reasoning}`;
}
