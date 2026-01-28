import { NextRequest, NextResponse } from 'next/server';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Test endpoint to simulate Telegram webhook calls
 * DISABLED in production for security
 *
 * Usage:
 * POST /api/test
 * Body: { "chatId": 123456789, "message": "450 calories" }
 */
export async function POST(request: NextRequest) {
  // Block in production
  if (IS_PRODUCTION) {
    return NextResponse.json(
      { error: 'Test endpoint is disabled in production' },
      { status: 403 }
    );
  }

  try {
    const { chatId, message } = await request.json();

    if (!chatId || !message) {
      return NextResponse.json(
        { error: 'Missing chatId or message in request body' },
        { status: 400 }
      );
    }

    // Create Telegram update object to simulate webhook
    const telegramUpdate = {
      update_id: Date.now(),
      message: {
        message_id: Date.now(),
        from: {
          id: Number(chatId),
          is_bot: false,
          first_name: 'Test',
          username: 'testuser',
        },
        chat: {
          id: Number(chatId),
          first_name: 'Test',
          username: 'testuser',
          type: 'private',
        },
        date: Math.floor(Date.now() / 1000),
        text: message,
      },
    };

    // Call the webhook handler
    const webhookUrl = new URL('/api/webhook', request.url);
    const response = await fetch(webhookUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(telegramUpdate),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Webhook call failed', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test message sent successfully',
      chatId,
      messageBody: message,
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Block in production
  if (IS_PRODUCTION) {
    return NextResponse.json(
      { error: 'Test endpoint is disabled in production' },
      { status: 403 }
    );
  }

  return NextResponse.json({
    message: 'Test endpoint for simulating Telegram webhook calls',
    usage: {
      method: 'POST',
      body: {
        chatId: 123456789,
        message: 'Your message here (e.g., "450 calories", "100g chicken", "today", "help")',
      },
    },
    examples: [
      { chatId: 123456789, message: 'help' },
      { chatId: 123456789, message: '450 calories' },
      { chatId: 123456789, message: '100g grilled chicken breast' },
      { chatId: 123456789, message: 'today' },
      { chatId: 123456789, message: 'week' },
    ],
  });
}
