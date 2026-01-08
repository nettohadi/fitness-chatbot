import { NextRequest, NextResponse } from 'next/server';
import { setTelegramWebhook, getWebhookInfo, deleteWebhook } from '@/lib/telegram';

/**
 * Set up Telegram webhook
 * GET /api/telegram/setup - Get webhook info
 * POST /api/telegram/setup - Set webhook
 * DELETE /api/telegram/setup - Delete webhook
 */

export async function GET() {
  try {
    const info = await getWebhookInfo();
    return NextResponse.json({
      success: true,
      webhookInfo: info,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get webhook info',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhookUrl } = body;

    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, error: 'webhookUrl is required' },
        { status: 400 }
      );
    }

    const result = await setTelegramWebhook(webhookUrl);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook set successfully',
      webhookUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set webhook',
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const result = await deleteWebhook();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete webhook',
      },
      { status: 500 }
    );
  }
}
