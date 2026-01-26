import { NextRequest, NextResponse } from "next/server"
import { lookupOtpByCode } from "@/lib/utils/otp"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { otpCode } = body

    if (!otpCode || typeof otpCode !== "string") {
      return NextResponse.json(
        { error: "OTP code is required" },
        { status: 400 }
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
