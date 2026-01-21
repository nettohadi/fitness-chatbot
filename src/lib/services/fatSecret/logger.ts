/**
 * FatSecret API Logger
 * Logs all FatSecret API calls to database for debugging
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { FatSecretFood } from './client';

export interface FatSecretLogData {
  searchQuery: string;
  results: FatSecretFood[];
  topCaloriesPer100g?: number | null;
  errorMessage?: string;
  latencyMs: number;
}

/**
 * Log a FatSecret API call to the database
 * Non-blocking - errors are caught and logged to console
 */
export async function logFatSecretCall(data: FatSecretLogData): Promise<void> {
  try {
    const topResult = data.results[0];

    await prisma.fatSecretLog.create({
      data: {
        searchQuery: data.searchQuery,
        resultCount: data.results.length,
        topResult: topResult?.food_name || null,
        topCalories: topResult ? parseCalories(topResult.food_description) : null,
        topServing: topResult ? parseServing(topResult.food_description) : null,
        calPer100g: data.topCaloriesPer100g ?? null,
        responseJson:
          data.results.length > 0 ? (data.results as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        errorMessage: data.errorMessage || null,
        latencyMs: data.latencyMs,
      },
    });
  } catch (error) {
    console.error('[FatSecret Logger] Failed to log:', error);
  }
}

/**
 * Parse calories from description
 */
function parseCalories(description: string): number | null {
  const match = description.match(/Calories:\s*(\d+(?:\.\d+)?)\s*kcal/i);
  return match ? Math.round(parseFloat(match[1])) : null;
}

/**
 * Parse serving from description
 */
function parseServing(description: string): string | null {
  const match = description.match(/^Per\s+([^-]+)/i);
  return match ? match[1].trim() : null;
}
