import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const userId = searchParams.get("userId")

    const where = userId ? { userId } : {}

    // Get logs with pagination
    const [logsRaw, total] = await Promise.all([
      prisma.claudeApiLog.findMany({
        where,
        include: {
          user: {
            select: {
              phoneNumber: true,
              fullName: true,
              nickname: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.claudeApiLog.count({ where }),
    ])

    // Get stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [totalCostResult, todayCostResult, todayLogs] = await Promise.all([
      prisma.claudeApiLog.aggregate({
        _sum: { totalCost: true },
      }),
      prisma.claudeApiLog.aggregate({
        _sum: { totalCost: true },
        where: { createdAt: { gte: today } },
      }),
      prisma.claudeApiLog.count({
        where: { createdAt: { gte: today } },
      }),
    ])

    // Serialize logs
    const logs = logsRaw.map((log) => ({
      id: log.id,
      createdAt: log.createdAt.toISOString(),
      model: log.model,
      inputTokens: log.inputTokens,
      outputTokens: log.outputTokens,
      totalCost: log.totalCost.toNumber(),
      latencyMs: log.latencyMs,
      user: log.user,
    }))

    return NextResponse.json({
      logs,
      stats: {
        totalCost: totalCostResult._sum.totalCost?.toNumber() || 0,
        todayCost: todayCostResult._sum.totalCost?.toNumber() || 0,
        totalLogs: total,
        todayLogs,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching logs:", error)
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    )
  }
}
