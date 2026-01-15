import { prisma } from "@/lib/prisma"

/**
 * Default pricing (Qwen3 32B via OpenRouter)
 */
const DEFAULT_PRICING = {
  INPUT_COST_PER_MILLION: 0.20, // $0.20 per million input tokens
  OUTPUT_COST_PER_MILLION: 0.50, // $0.50 per million output tokens
}

/**
 * Calculate cost for API call (default pricing)
 */
export function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * DEFAULT_PRICING.INPUT_COST_PER_MILLION
  const outputCost = (outputTokens / 1_000_000) * DEFAULT_PRICING.OUTPUT_COST_PER_MILLION
  return inputCost + outputCost
}

/**
 * Log API call to database
 */
export async function logClaudeApiCall({
  userId,
  model,
  systemPrompt,
  messages,
  response,
  inputTokens,
  outputTokens,
  latencyMs,
  totalCost: providedCost,
}: {
  userId?: string
  model: string
  systemPrompt: string
  messages: any[]
  response: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
  totalCost?: number
}) {
  try {
    // Use provided cost or calculate default
    const totalCost = providedCost ?? calculateCost(inputTokens, outputTokens)

    await prisma.claudeApiLog.create({
      data: {
        userId: userId || null,
        model,
        systemPrompt,
        messages,
        response,
        inputTokens,
        outputTokens,
        totalCost,
        latencyMs,
      },
    })

    console.log(
      `📊 API Log: ${inputTokens + outputTokens} tokens, $${totalCost.toFixed(6)}, ${latencyMs}ms`
    )
  } catch (error) {
    console.error("❌ Failed to log API call:", error)
    // Don't throw - logging failure shouldn't break the main flow
  }
}
