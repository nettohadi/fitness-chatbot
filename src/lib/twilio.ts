import twilio from 'twilio';

// Environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
export const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

if (!accountSid) {
  throw new Error('Missing TWILIO_ACCOUNT_SID environment variable');
}

if (!authToken) {
  throw new Error('Missing TWILIO_AUTH_TOKEN environment variable');
}

if (!twilioWhatsAppNumber) {
  throw new Error('Missing TWILIO_WHATSAPP_NUMBER environment variable');
}

// Create Twilio client
export const twilioClient = twilio(accountSid, authToken);

/**
 * Send a WhatsApp message via Twilio
 * @param to - Recipient phone number in E.164 format (e.g., whatsapp:+1234567890)
 * @param body - Message body
 * @returns Promise with message SID
 */
export async function sendWhatsAppMessage(
  to: string,
  body: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  try {
    const message = await twilioClient.messages.create({
      from: twilioWhatsAppNumber,
      to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
      body,
    });

    return {
      success: true,
      messageSid: message.sid,
    };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate Twilio webhook signature to ensure the request is from Twilio
 * @param url - The full URL of the webhook
 * @param params - The POST parameters from the webhook
 * @param signature - The X-Twilio-Signature header value
 * @returns boolean indicating if the signature is valid
 */
export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  if (!authToken) {
    console.error('Missing auth token for signature validation');
    return false;
  }

  return twilio.validateRequest(authToken, signature, url, params);
}
