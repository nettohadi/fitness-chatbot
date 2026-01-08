import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to simulate Twilio webhook calls
 *
 * Usage:
 * POST /api/test
 * Body: { "phoneNumber": "+1234567890", "message": "450 calories" }
 */
export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, message } = await request.json();

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: 'Missing phoneNumber or message in request body' },
        { status: 400 }
      );
    }

    // Create form data to simulate Twilio webhook
    const formData = new FormData();
    formData.append('From', `whatsapp:${phoneNumber}`);
    formData.append('To', process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886');
    formData.append('Body', message);
    formData.append('MessageSid', `TEST${Date.now()}`);
    formData.append('AccountSid', 'TESTACCOUNT');

    // Call the webhook handler
    const webhookUrl = new URL('/api/webhook', request.url);
    const response = await fetch(webhookUrl.toString(), {
      method: 'POST',
      body: formData,
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
      phoneNumber,
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
  return NextResponse.json({
    message: 'Test endpoint for simulating Twilio webhook calls',
    usage: {
      method: 'POST',
      body: {
        phoneNumber: '+1234567890',
        message: 'Your message here (e.g., "450 calories", "100g chicken", "today", "help")',
      },
    },
    examples: [
      { phoneNumber: '+1234567890', message: 'help' },
      { phoneNumber: '+1234567890', message: '450 calories' },
      { phoneNumber: '+1234567890', message: '100g grilled chicken breast' },
      { phoneNumber: '+1234567890', message: 'today' },
      { phoneNumber: '+1234567890', message: 'week' },
    ],
  });
}
