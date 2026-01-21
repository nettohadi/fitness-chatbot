/**
 * Secure Debug API Endpoint
 * Used for debugging LLM responses and conversation history
 * Protected by a secret token
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Secret token for API access - set in environment variables
const DEBUG_API_TOKEN = process.env.DEBUG_API_TOKEN;

/**
 * Verify the request has a valid token
 */
function verifyToken(request: NextRequest): boolean {
  if (!DEBUG_API_TOKEN) {
    console.error('[DEBUG-API] DEBUG_API_TOKEN not configured');
    return false;
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  return token === DEBUG_API_TOKEN;
}

/**
 * GET /api/admin/debug
 * Query parameters:
 * - type: 'logs' | 'messages' | 'users' | 'full-log' | 'calories' | 'exercises' | 'fatsecret'
 * - limit: number (default 10, max 50)
 * - userId: string (optional, filter by user)
 * - phone: string (optional, find user by phone)
 * - from: ISO date string (optional, filter logs from this date/time)
 * - to: ISO date string (optional, filter logs until this date/time)
 * - date: YYYY-MM-DD (optional, shorthand for a specific day)
 * - query: string (optional, filter fatsecret logs by search query)
 * - errors: 'true' (optional, filter fatsecret logs to show only errors)
 */
export async function GET(request: NextRequest) {
  // Verify token
  if (!verifyToken(request)) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid or missing token' },
      { status: 401 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'logs';
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
  const userId = searchParams.get('userId');
  const phone = searchParams.get('phone');

  // Date/time filters
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const dateParam = searchParams.get('date'); // YYYY-MM-DD shorthand

  // Build date filter
  let dateFilter: { gte?: Date; lte?: Date } | undefined;
  if (dateParam) {
    // Specific day filter (YYYY-MM-DD)
    const dayStart = new Date(dateParam + 'T00:00:00.000Z');
    const dayEnd = new Date(dateParam + 'T23:59:59.999Z');
    dateFilter = { gte: dayStart, lte: dayEnd };
  } else if (fromParam || toParam) {
    dateFilter = {};
    if (fromParam) dateFilter.gte = new Date(fromParam);
    if (toParam) dateFilter.lte = new Date(toParam);
  }

  try {
    switch (type) {
      case 'logs': {
        // Build where clause
        const where: any = {};
        if (userId) where.userId = userId;
        if (dateFilter) where.createdAt = dateFilter;

        // Get recent API logs
        const logs = await prisma.claudeApiLog.findMany({
          where: Object.keys(where).length > 0 ? where : undefined,
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            createdAt: true,
            userId: true,
            model: true,
            systemPrompt: true,
            messages: true,
            response: true,
            inputTokens: true,
            outputTokens: true,
            totalCost: true,
            latencyMs: true,
          },
        });

        return NextResponse.json({
          type: 'logs',
          count: logs.length,
          filters: { userId, dateFilter: dateFilter ? { from: dateFilter.gte, to: dateFilter.lte } : null },
          data: logs.map((log) => ({
            ...log,
            // Truncate long fields for readability
            systemPrompt: log.systemPrompt?.substring(0, 500) + (log.systemPrompt && log.systemPrompt.length > 500 ? '...' : ''),
            response: log.response?.substring(0, 500) + (log.response && log.response.length > 500 ? '...' : ''),
          })),
        });
      }

      case 'messages': {
        // Get conversation logs
        const where: any = {};
        if (phone) where.phoneNumber = { contains: phone };
        if (dateFilter) where.createdAt = dateFilter;

        const messages = await prisma.conversationLog.findMany({
          where: Object.keys(where).length > 0 ? where : undefined,
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            phoneNumber: true,
            messageType: true,
            messageBody: true,
            createdAt: true,
          },
        });

        return NextResponse.json({
          type: 'messages',
          count: messages.length,
          filters: { phone, dateFilter: dateFilter ? { from: dateFilter.gte, to: dateFilter.lte } : null },
          data: messages,
        });
      }

      case 'users': {
        // Get users (optionally find by phone)
        const where: any = {};
        if (phone) where.phoneNumber = { contains: phone };

        const users = await prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          // Include all fields
        });

        return NextResponse.json({
          type: 'users',
          count: users.length,
          data: users,
        });
      }

      case 'full-log': {
        // Get a single log with full content (by ID)
        const logId = searchParams.get('id');
        if (!logId) {
          return NextResponse.json({ error: 'id parameter required for full-log' }, { status: 400 });
        }

        const log = await prisma.claudeApiLog.findUnique({
          where: { id: logId },
        });

        if (!log) {
          return NextResponse.json({ error: 'Log not found' }, { status: 404 });
        }

        return NextResponse.json({
          type: 'full-log',
          data: log,
        });
      }

      case 'calories': {
        // Get calorie entries with full date info for debugging timezone issues
        const where: any = {};
        if (userId) where.userId = userId;
        if (dateFilter) where.createdAt = dateFilter;

        // If phone provided, find user first
        if (phone) {
          const user = await prisma.user.findFirst({
            where: { phoneNumber: { contains: phone } },
            select: { id: true },
          });
          if (user) {
            where.userId = user.id;
          }
        }

        const entries = await prisma.calorieEntry.findMany({
          where: Object.keys(where).length > 0 ? where : undefined,
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            userId: true,
            calories: true,
            foodDescription: true,
            entryDate: true,
            entryTime: true,
            createdAt: true,
            estimatedByAi: true,
          },
        });

        return NextResponse.json({
          type: 'calories',
          count: entries.length,
          filters: { userId, phone, dateFilter: dateFilter ? { from: dateFilter.gte, to: dateFilter.lte } : null },
          serverTime: {
            utc: new Date().toISOString(),
            utcDate: new Date().toISOString().split('T')[0],
          },
          data: entries.map((entry) => ({
            ...entry,
            // Format dates for easy reading
            entryDateFormatted: entry.entryDate ? entry.entryDate.toISOString().split('T')[0] : null,
            createdAtFormatted: entry.createdAt.toISOString(),
          })),
        });
      }

      case 'exercises': {
        // Get exercise entries with full date info for debugging timezone issues
        const where: any = {};
        if (userId) where.userId = userId;
        if (dateFilter) where.createdAt = dateFilter;

        // If phone provided, find user first
        if (phone) {
          const user = await prisma.user.findFirst({
            where: { phoneNumber: { contains: phone } },
            select: { id: true },
          });
          if (user) {
            where.userId = user.id;
          }
        }

        const entries = await prisma.exerciseEntry.findMany({
          where: Object.keys(where).length > 0 ? where : undefined,
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            userId: true,
            exerciseType: true,
            durationMinutes: true,
            caloriesBurned: true,
            entryDate: true,
            entryTime: true,
            createdAt: true,
          },
        });

        return NextResponse.json({
          type: 'exercises',
          count: entries.length,
          filters: { userId, phone, dateFilter: dateFilter ? { from: dateFilter.gte, to: dateFilter.lte } : null },
          serverTime: {
            utc: new Date().toISOString(),
            utcDate: new Date().toISOString().split('T')[0],
          },
          data: entries.map((entry) => ({
            ...entry,
            // Format dates for easy reading
            entryDateFormatted: entry.entryDate ? entry.entryDate.toISOString().split('T')[0] : null,
            createdAtFormatted: entry.createdAt.toISOString(),
          })),
        });
      }

      case 'fatsecret': {
        // Get FatSecret API logs for debugging food searches
        const where: any = {};
        if (dateFilter) where.createdAt = dateFilter;

        // Optional search query filter
        const query = searchParams.get('query');
        if (query) where.searchQuery = { contains: query, mode: 'insensitive' };

        // Optional error filter
        const errorsOnly = searchParams.get('errors') === 'true';
        if (errorsOnly) where.errorMessage = { not: null };

        const logs = await prisma.fatSecretLog.findMany({
          where: Object.keys(where).length > 0 ? where : undefined,
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            searchQuery: true,
            resultCount: true,
            topResult: true,
            topCalories: true,
            topServing: true,
            calPer100g: true,
            responseJson: true,
            errorMessage: true,
            latencyMs: true,
            createdAt: true,
          },
        });

        return NextResponse.json({
          type: 'fatsecret',
          count: logs.length,
          filters: {
            query,
            errorsOnly,
            dateFilter: dateFilter ? { from: dateFilter.gte, to: dateFilter.lte } : null,
          },
          data: logs.map((log) => ({
            ...log,
            createdAtFormatted: log.createdAt.toISOString(),
          })),
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type. Use: logs, messages, users, full-log, calories, exercises, or fatsecret' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[DEBUG-API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
