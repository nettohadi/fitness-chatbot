/**
 * Voice Transcription Service
 * Transcribes voice messages using OpenAI Whisper API
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/audio/transcriptions';

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  error?: string;
  durationMs?: number;
}

/**
 * Download audio file from Telegram
 */
async function downloadTelegramFile(fileUrl: string): Promise<ArrayBuffer> {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }
  return response.arrayBuffer();
}

/**
 * Get file URL from Telegram file_id
 */
async function getTelegramFileUrl(fileId: string): Promise<string> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN not configured');
  }

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
  );

  if (!response.ok) {
    throw new Error(`Failed to get file info: ${response.status}`);
  }

  const data = await response.json();
  if (!data.ok || !data.result?.file_path) {
    throw new Error('Invalid file response from Telegram');
  }

  return `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
}

/**
 * Transcribe audio using OpenAI Whisper API
 */
export async function transcribeVoiceMessage(fileId: string): Promise<TranscriptionResult> {
  const startTime = Date.now();

  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('[Transcription] OPENAI_API_KEY not configured');
      return { success: false, error: 'Transcription service not configured' };
    }

    // Step 1: Get file URL from Telegram
    console.log('[Transcription] Getting file URL for:', fileId);
    const fileUrl = await getTelegramFileUrl(fileId);
    console.log('[Transcription] File URL obtained');

    // Step 2: Download the audio file
    console.log('[Transcription] Downloading audio file...');
    const audioBuffer = await downloadTelegramFile(fileUrl);
    console.log('[Transcription] Downloaded', audioBuffer.byteLength, 'bytes');

    // Step 3: Create form data for Whisper API
    const formData = new FormData();
    // Telegram voice messages are in .ogg format (opus codec)
    formData.append('file', new Blob([audioBuffer], { type: 'audio/ogg' }), 'voice.ogg');
    formData.append('model', 'whisper-1');
    // Optional: specify language hint for better accuracy
    // formData.append('language', 'id'); // Indonesian

    // Step 4: Send to Whisper API
    console.log('[Transcription] Sending to Whisper API...');
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Transcription] Whisper API error:', response.status, errorText);
      return { success: false, error: `Transcription failed: ${response.status}` };
    }

    const result = await response.json();
    const durationMs = Date.now() - startTime;

    console.log('[Transcription] Success in', durationMs, 'ms:', result.text?.substring(0, 100));

    return {
      success: true,
      text: result.text,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error('[Transcription] Error after', durationMs, 'ms:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown transcription error',
      durationMs,
    };
  }
}
