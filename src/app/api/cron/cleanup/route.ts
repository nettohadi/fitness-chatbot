import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Cleanup Cron Job
 * - Deletes Claude API logs older than 7 days
 * - Deletes expired OTP sessions
 *
 * Can be triggered manually or via scheduled cron (e.g., Vercel Cron)
 */
export async function GET() {
  try {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Delete old API logs
    const deletedLogs = await prisma.claudeApiLog.deleteMany({
      where: {
        createdAt: {
          lt: sevenDaysAgo,
        },
      },
    })

    // Delete expired OTP sessions
    const deletedOtps = await prisma.otpSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    })

    console.log(`🧹 Cleanup completed:`)
    console.log(`   - Deleted ${deletedLogs.count} API logs older than 7 days`)
    console.log(`   - Deleted ${deletedOtps.count} expired OTP sessions`)

    return NextResponse.json({
      success: true,
      deleted: {
        apiLogs: deletedLogs.count,
        otpSessions: deletedOtps.count,
      },
      message: `Cleaned up ${deletedLogs.count} API logs and ${deletedOtps.count} OTP sessions`,
    })
  } catch (error) {
    console.error("❌ Cleanup error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Cleanup failed",
      },
      { status: 500 }
    )
  }
}
