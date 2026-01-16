import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // User growth stats
    const [totalUsers, last30DaysUsers, last7DaysUsers, completedProfiles] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),
        prisma.user.count({
          where: { createdAt: { gte: sevenDaysAgo } },
        }),
        prisma.user.count({
          where: { profileCompleted: true },
        }),
      ])

    // Entry stats
    const [totalCalorieEntries, totalExerciseEntries, entriesLast7Days] =
      await Promise.all([
        prisma.calorieEntry.count(),
        prisma.exerciseEntry.count(),
        Promise.all([
          prisma.calorieEntry.count({
            where: { createdAt: { gte: sevenDaysAgo } },
          }),
          prisma.exerciseEntry.count({
            where: { createdAt: { gte: sevenDaysAgo } },
          }),
        ]),
      ])

    // API usage stats
    const apiStats = await prisma.claudeApiLog.aggregate({
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalCost: true,
      },
      _avg: {
        latencyMs: true,
      },
    })

    // Top exercises types
    const topExercises = await prisma.exerciseEntry.groupBy({
      by: ["exerciseType"],
      _count: {
        exerciseType: true,
      },
      orderBy: {
        _count: {
          exerciseType: "desc",
        },
      },
      take: 5,
    })

    // User activity distribution
    const activeUsers = await prisma.user.count({
      where: {
        OR: [
          {
            calorieEntries: {
              some: {
                createdAt: { gte: sevenDaysAgo },
              },
            },
          },
          {
            exerciseEntries: {
              some: {
                createdAt: { gte: sevenDaysAgo },
              },
            },
          },
        ],
      },
    })

    return NextResponse.json({
      users: {
        total: totalUsers,
        last30Days: last30DaysUsers,
        last7Days: last7DaysUsers,
        completedProfiles,
        profileCompletionRate:
          totalUsers > 0 ? (completedProfiles / totalUsers) * 100 : 0,
      },
      entries: {
        totalCalorie: totalCalorieEntries,
        totalExercise: totalExerciseEntries,
        last7DaysCalorie: entriesLast7Days[0],
        last7DaysExercise: entriesLast7Days[1],
      },
      api: {
        totalCost: apiStats._sum.totalCost?.toNumber() || 0,
        totalInputTokens: apiStats._sum.inputTokens || 0,
        totalOutputTokens: apiStats._sum.outputTokens || 0,
        avgLatency: apiStats._avg.latencyMs || 0,
      },
      topExercises,
      activity: {
        activeUsers,
        activeRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
      },
    })
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}
