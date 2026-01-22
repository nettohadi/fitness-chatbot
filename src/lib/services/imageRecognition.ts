/**
 * Image Recognition Service
 * Recognizes food from images using vision models via OpenRouter
 */

import { logClaudeApiCall } from '@/lib/utils/apiLogger';
import { getFoodEstimateModel } from './settings';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Pricing per 1M tokens (Gemini 2.5 Flash)
const PRICING = {
  INPUT_COST_PER_MILLION: 0.30,
  OUTPUT_COST_PER_MILLION: 2.50,
};

export interface FoodImageResult {
  success: boolean;
  foods?: Array<{
    food: string;
    calories: number;
    portion: string;
    calPer100g: number;
  }>;
  message?: string;
  error?: string;
}

/**
 * Download image from Telegram and convert to base64
 */
async function downloadTelegramImage(fileId: string): Promise<{ base64: string; mimeType: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN not configured');
  }

  // Get file path from Telegram
  const fileResponse = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
  );

  if (!fileResponse.ok) {
    throw new Error(`Failed to get file info: ${fileResponse.status}`);
  }

  const fileData = await fileResponse.json();
  if (!fileData.ok || !fileData.result?.file_path) {
    throw new Error('Invalid file response from Telegram');
  }

  const filePath = fileData.result.file_path;
  const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

  // Download the image
  const imageResponse = await fetch(fileUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`);
  }

  const arrayBuffer = await imageResponse.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  // Determine mime type from file extension
  const ext = filePath.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  return { base64, mimeType };
}

/**
 * Recognize food from image and estimate calories
 */
export async function recognizeFoodFromImage(
  fileId: string,
  userId?: string,
  caption?: string
): Promise<FoodImageResult> {
  const startTime = Date.now();

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'OpenRouter API key not configured' };
    }

    // Download image and convert to base64
    console.log('[ImageRecognition] Downloading image:', fileId);
    const { base64, mimeType } = await downloadTelegramImage(fileId);
    console.log('[ImageRecognition] Image downloaded, size:', Math.round(base64.length / 1024), 'KB');

    // Get model from settings (use same model as food estimation)
    const modelId = await getFoodEstimateModel();
    console.log('[ImageRecognition] Using model:', modelId);

    // Build the prompt
    const systemPrompt = `You are a food calorie estimator. Analyze the food image and estimate calories.

RULES:
1. Identify all visible food items
2. Estimate portion size based on visual cues (plate size, utensils, etc.)
3. Calculate calories: portion × calories per 100g
4. Output RAW JSON only - no markdown, no code blocks
5. If no food visible, return {"success":false,"message":"No food detected"}

OUTPUT FORMAT (JSON only):
{"foods":[{"food":"Nasi putih","calories":195,"portion":"150g","calPer100g":130}],"message":"🍚 Nasi putih\\n150g × 130/100g = 195 kcal\\n\\nTotal: 195 kcal\\nSimpan?"}

For multiple foods:
{"foods":[{"food":"Nasi putih","calories":195,"portion":"150g","calPer100g":130},{"food":"Ayam goreng","calories":130,"portion":"50g","calPer100g":260}],"message":"🍚 Nasi: 150g × 130/100g = 195 kcal\\n🍗 Ayam goreng: 50g × 260/100g = 130 kcal\\n\\nTotal: 325 kcal\\nSimpan?"}`;

    const userMessage = caption
      ? `Analyze this food image. User caption: "${caption}"`
      : 'Analyze this food image and estimate calories for each food item.';

    // Call OpenRouter with image URL
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://fitness-chatbot.vercel.app',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userMessage },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
            ],
          },
        ],
        max_tokens: 512,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ImageRecognition] API error:', response.status, errorText);
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;

    // Extract response
    const content = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0 };

    console.log('[ImageRecognition] Response:', content.substring(0, 200));

    // Log API call
    const inputCost = (usage.prompt_tokens / 1_000_000) * PRICING.INPUT_COST_PER_MILLION;
    const outputCost = (usage.completion_tokens / 1_000_000) * PRICING.OUTPUT_COST_PER_MILLION;
    const totalCost = inputCost + outputCost;

    await logClaudeApiCall({
      userId,
      model: modelId,
      systemPrompt,
      messages: [{ role: 'user', content: `[IMAGE] ${userMessage}` }],
      response: content,
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      latencyMs,
      totalCost,
    });

    // Parse JSON response
    try {
      // Clean potential markdown
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }

      const parsed = JSON.parse(jsonStr);

      if (parsed.success === false) {
        return { success: false, message: parsed.message || 'No food detected in image' };
      }

      return {
        success: true,
        foods: parsed.foods,
        message: parsed.message,
      };
    } catch (parseError) {
      console.error('[ImageRecognition] Failed to parse response:', parseError);
      // Return the raw message if JSON parsing fails
      return {
        success: true,
        message: content,
      };
    }
  } catch (error) {
    console.error('[ImageRecognition] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
