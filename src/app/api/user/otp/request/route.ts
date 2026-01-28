import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createOtpSession } from "@/lib/utils/otp"
import { sendTelegramMessage } from "@/lib/telegram"
import { rateLimiters, getRateLimitHeaders } from "@/lib/security/rateLimit"

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      )
    }

    // Rate limit OTP requests per phone number
    const rateLimit = rateLimiters.otp(phoneNumber)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found. Please register via the chatbot first." },
        { status: 404 }
      )
    }

    // Create OTP session
    const otpCode = await createOtpSession(phoneNumber)

    // Send OTP via Telegram
    const message = `Your dashboard login OTP: *${otpCode}*\n\nThis code expires in 10 minutes.`
    const result = await sendTelegramMessage(phoneNumber, message, "Markdown")

    if (!result.success) {
      console.error("Failed to send OTP via Telegram:", result.error)
      // Still return success - user can check their messages
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent to your Telegram",
    })
  } catch (error) {
    console.error("OTP request error:", error)
    return NextResponse.json(
      { error: "Failed to send OTP" },
      { status: 500 }
    )
  }
}
