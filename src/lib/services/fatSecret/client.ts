/**
 * FatSecret API Client
 * Uses OAuth 1.0 HMAC-SHA1 for authentication (no IP whitelisting required)
 * Docs: https://platform.fatsecret.com/docs/guides/authentication/oauth1
 */

import crypto from 'crypto';
import { logFatSecretCall } from './logger';

const FATSECRET_API_URL = 'https://platform.fatsecret.com/rest/server.api';

export interface FatSecretFood {
  food_id: string;
  food_name: string;
  food_description: string; // "Per 100g - Calories: 130kcal | Fat: 0.28g | Carbs: 28.17g | Protein: 2.69g"
  brand_name?: string;
}

export interface FatSecretSearchResult {
  foods?: {
    food: FatSecretFood | FatSecretFood[];
    max_results: string;
    page_number: string;
    total_results: string;
  };
  error?: {
    code: number;
    message: string;
  };
}

/**
 * RFC 3986 percent encoding (stricter than encodeURIComponent)
 */
function rfc3986Encode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

/**
 * Generate OAuth 1.0 signature base string
 */
function generateSignatureBaseString(method: string, url: string, params: Record<string, string>): string {
  // Sort parameters alphabetically and encode
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${rfc3986Encode(key)}=${rfc3986Encode(params[key])}`)
    .join('&');

  return `${method}&${rfc3986Encode(url)}&${rfc3986Encode(sortedParams)}`;
}

/**
 * Generate HMAC-SHA1 signature
 */
function generateSignature(baseString: string, consumerSecret: string, tokenSecret: string = ''): string {
  const signingKey = `${rfc3986Encode(consumerSecret)}&${rfc3986Encode(tokenSecret)}`;
  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
}

/**
 * Search foods in FatSecret database using OAuth 1.0
 * Supports Indonesian and English food names
 */
export async function searchFoods(query: string, maxResults: number = 5): Promise<FatSecretFood[]> {
  // Note: env var has typo "COMSUMER" instead of "CONSUMER"
  const consumerKey = process.env.FAT_SECRET_COMSUMER_KEY;
  const consumerSecret = process.env.FAT_SECRET_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    console.warn('[FatSecret] API keys not configured');
    return [];
  }

  const startTime = Date.now();

  try {
    // OAuth 1.0 parameters
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: consumerKey,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_version: '1.0',
    };

    // API parameters
    const apiParams: Record<string, string> = {
      method: 'foods.search',
      search_expression: query,
      format: 'json',
      max_results: maxResults.toString(),
    };

    // Combine all parameters for signature
    const allParams = { ...oauthParams, ...apiParams };

    // Generate signature
    const baseString = generateSignatureBaseString('POST', FATSECRET_API_URL, allParams);
    const signature = generateSignature(baseString, consumerSecret);

    // Add signature to params
    allParams.oauth_signature = signature;

    // Build request body
    const body = new URLSearchParams(allParams);

    const response = await fetch(FATSECRET_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
      console.error('[FatSecret] API error:', errorMsg);

      // Log the error - await to ensure completion
      await logFatSecretCall({
        searchQuery: query,
        results: [],
        errorMessage: errorMsg,
        latencyMs,
      }).catch((err) => console.error('[FatSecret] Log failed:', err));

      return [];
    }

    const data: FatSecretSearchResult = await response.json();

    // Check for API errors
    if (data.error) {
      const errorMsg = `Error ${data.error.code}: ${data.error.message}`;
      console.error('[FatSecret] API error:', errorMsg);

      // Log the error - await to ensure completion
      await logFatSecretCall({
        searchQuery: query,
        results: [],
        errorMessage: errorMsg,
        latencyMs,
      }).catch((err) => console.error('[FatSecret] Log failed:', err));

      return [];
    }

    // Handle no results
    if (!data.foods?.food) {
      // Log empty results - await to ensure completion
      await logFatSecretCall({
        searchQuery: query,
        results: [],
        latencyMs,
      }).catch((err) => console.error('[FatSecret] Log failed:', err));

      return [];
    }

    // Handle single result vs array
    const results = Array.isArray(data.foods.food) ? data.foods.food : [data.foods.food];

    // Log successful results (calculate per100g for top result)
    const topResult = results[0];
    let topCaloriesPer100g: number | null = null;
    if (topResult) {
      const calories = parseCaloriesFromDescription(topResult.food_description);
      const serving = parseServingFromDescription(topResult.food_description);
      const grams = extractGramsFromServing(serving);
      if (calories && grams && grams > 0) {
        topCaloriesPer100g = Math.round((calories / grams) * 100);
      }
    }

    // Await logging to ensure it completes in serverless environments
    await logFatSecretCall({
      searchQuery: query,
      results,
      topCaloriesPer100g,
      latencyMs,
    }).catch((err) => console.error('[FatSecret] Log failed:', err));

    return results;
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[FatSecret] Request failed:', errorMsg);

    // Log the error - await to ensure it completes
    await logFatSecretCall({
      searchQuery: query,
      results: [],
      errorMessage: errorMsg,
      latencyMs,
    }).catch((err) => console.error('[FatSecret] Error log failed:', err));

    return [];
  }
}

/**
 * Extract grams from serving string (used for logging)
 */
function extractGramsFromServing(serving: string): number | null {
  const match = serving.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Parse calories from FatSecret food description
 * Format: "Per 100g - Calories: 130kcal | Fat: 0.28g | Carbs: 28.17g | Protein: 2.69g"
 */
export function parseCaloriesFromDescription(description: string): number | null {
  const match = description.match(/Calories:\s*(\d+(?:\.\d+)?)\s*kcal/i);
  return match ? Math.round(parseFloat(match[1])) : null;
}

/**
 * Parse serving size from FatSecret food description
 * Format: "Per 100g - ..." or "Per 1 cup - ..."
 */
export function parseServingFromDescription(description: string): string {
  const match = description.match(/^Per\s+([^-]+)/i);
  return match ? match[1].trim() : '1 serving';
}
