import { prisma } from "@/lib/prisma"

/**
 * Generate a 6-digit OTP code
 */
export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Create an OTP session for a user
 * @param phoneNumber - User's phone number
 * @returns The generated OTP code
 */
export async function createOtpSession(phoneNumber: string): Promise<string> {
  const otpCode = generateOtpCode()
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + 10) // OTP expires in 10 minutes

  await prisma.otpSession.create({
    data: {
      phoneNumber,
      otpCode,
      expiresAt,
      verified: false,
    },
  })

  return otpCode
}

/**
 * Verify an OTP code
 * @param phoneNumber - User's phone number
 * @param otpCode - OTP code to verify
 * @returns true if valid, false otherwise
 */
export async function verifyOtpCode(
  phoneNumber: string,
  otpCode: string
): Promise<boolean> {
  const otpSession = await prisma.otpSession.findFirst({
    where: {
      phoneNumber,
      otpCode,
      verified: false,
      expiresAt: {
        gt: new Date(), // Not expired
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  if (!otpSession) {
    return false
  }

  // Mark as verified
  await prisma.otpSession.update({
    where: { id: otpSession.id },
    data: { verified: true },
  })

  return true
}

/**
 * Clean up expired OTP sessions
 * Should be run periodically (e.g., via cron job)
 */
export async function cleanupExpiredOtpSessions(): Promise<number> {
  const result = await prisma.otpSession.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  })

  return result.count
}
