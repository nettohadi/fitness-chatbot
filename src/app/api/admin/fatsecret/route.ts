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
    const query = searchParams.get("query")
    const errorsOnly = searchParams.get("errors") === "true"

    // Build where clause
    const where: any = {}
    if (query) {
      where.searchQuery = { contains: query, mode: "insensitive" }
    }
    if (errorsOnly) {
      where.errorMessage = { not: null }
    }

    // Get logs with pagination
    const [logsRaw, total] = await Promise.all([
      prisma.fatSecretLog.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.fatSecretLog.count({ where }),
    ])

    // Get stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [totalLogs, todayLogs, errorLogs, avgLatency] = await Promise.all([
      prisma.fatSecretLog.count(),
      prisma.fatSecretLog.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.fatSecretLog.count({
        where: { errorMessage: { not: null } },
      }),
      prisma.fatSecretLog.aggregate({
        _avg: { latencyMs: true },
      }),
    ])

    // Serialize logs
    const logs = logsRaw.map((log) => ({
      id: log.id,
      createdAt: log.createdAt.toISOString(),
      searchQuery: log.searchQuery,
      resultCount: log.resultCount,
      topResult: log.topResult,
      topCalories: log.topCalories,
      topServing: log.topServing,
      calPer100g: log.calPer100g,
      responseJson: log.responseJson,
      errorMessage: log.errorMessage,
      latencyMs: log.latencyMs,
    }))

    return NextResponse.json({
      logs,
      stats: {
        totalLogs,
        todayLogs,
        errorLogs,
        avgLatency: Math.round(avgLatency._avg.latencyMs || 0),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching FatSecret logs:", error)
    return NextResponse.json(
      { error: "Failed to fetch FatSecret logs" },
      { status: 500 }
    )
  }
}
