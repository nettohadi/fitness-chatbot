import { prisma } from "@/lib/prisma"

/**
 * Claude API pricing (as of Jan 2025)
 * Model: claude-sonnet-4-20250514
 */
const PRICING = {
  INPUT_COST_PER_MILLION: 3.0, // $3 per million input tokens
  OUTPUT_COST_PER_MILLION: 15.0, // $15 per million output tokens
}

/**
 * Calculate cost for API call
 */
export function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * PRICING.INPUT_COST_PER_MILLION
  const outputCost = (outputTokens / 1_000_000) * PRICING.OUTPUT_COST_PER_MILLION
  return inputCost + outputCost
}

/**
 * Log Claude API call to database
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
}: {
  userId?: string
  model: string
  systemPrompt: string
  messages: any[]
  response: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
}) {
  try {
    const totalCost = calculateCost(inputTokens, outputTokens)

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
