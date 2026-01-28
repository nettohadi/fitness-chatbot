import { NextRequest, NextResponse } from "next/server"
import { lookupOtpByCode } from "@/lib/utils/otp"
import { rateLimiters, getRateLimitHeaders } from "@/lib/security/rateLimit"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { otpCode, phoneNumber: phoneForRateLimit } = body

    if (!otpCode || typeof otpCode !== "string") {
      return NextResponse.json(
        { error: "OTP code is required" },
        { status: 400 }
      )
    }

    // Rate limit OTP verification attempts (use IP if phone not provided)
    const rateLimitKey = phoneForRateLimit || request.headers.get("x-forwarded-for") || "unknown"
    const rateLimit = rateLimiters.otpVerify(rateLimitKey)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      )
    }

    // Look up phone number by OTP code (doesn't mark as verified)
    const phoneNumber = await lookupOtpByCode(otpCode)

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Invalid or expired OTP code" },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      phoneNumber,
    })
  } catch (error) {
    console.error("Error looking up OTP:", error)
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    )
  }
}
