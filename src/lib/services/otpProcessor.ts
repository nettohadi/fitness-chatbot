/**
 * OTP Processor Service
 * Handles OTP generation and delivery via Telegram
 */

import { createOtpSession } from "@/lib/utils/otp"

export interface OtpRequestResult {
  success: boolean
  message: string
  otpCode?: string
}

/**
 * Process OTP request from Telegram
 * Generates OTP and returns message with code
 *
 * @param phoneNumber - User's phone number (stored in DB)
 * @param language - User's preferred language
 * @returns Result with success status and message
 */
export async function processOtpRequest(
  phoneNumber: string | null,
  language: string = "id"
): Promise<OtpRequestResult> {
  // Check if user has a phone number registered
  if (!phoneNumber) {
    const noPhoneMessage =
      language === "id"
        ? "Nomor telepon belum terdaftar. Silakan lengkapi profil Anda terlebih dahulu dengan mengirim pesan seperti 'telepon saya 08123456789'."
        : "Phone number not registered. Please complete your profile first by sending a message like 'my phone is 08123456789'."

    return {
      success: false,
      message: noPhoneMessage,
    }
  }

  try {
    // Generate OTP
    const otpCode = await createOtpSession(phoneNumber)

    // Build success message with OTP code
    const message =
      language === "id"
        ? `🔐 *Kode OTP Anda:*

\`${otpCode}\`

Gunakan kode ini untuk login ke dashboard di:
https://fitness-chatbot-rosy.vercel.app/login

⏱️ Kode berlaku selama 10 menit.
⚠️ Jangan bagikan kode ini kepada siapapun.`
        : `🔐 *Your OTP Code:*

\`${otpCode}\`

Use this code to login to your dashboard at:
https://fitness-chatbot-rosy.vercel.app/login

⏱️ Code is valid for 10 minutes.
⚠️ Do not share this code with anyone.`

    return {
      success: true,
      message,
      otpCode,
    }
  } catch (error) {
    console.error("Error generating OTP:", error)

    const errorMessage =
      language === "id"
        ? "Maaf, terjadi kesalahan saat membuat kode OTP. Silakan coba lagi."
        : "Sorry, there was an error generating the OTP code. Please try again."

    return {
      success: false,
      message: errorMessage,
    }
  }
}
