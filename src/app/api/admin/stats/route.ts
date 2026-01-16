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
    // Get total users
    const totalUsers = await prisma.user.count()

    // Get active users (users with activity in last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const activeUsers = await prisma.user.count({
      where: {
        OR: [
          {
            calorieEntries: {
              some: {
                createdAt: {
                  gte: sevenDaysAgo,
                },
              },
            },
          },
          {
            exerciseEntries: {
              some: {
                createdAt: {
                  gte: sevenDaysAgo,
                },
              },
            },
          },
        ],
      },
    })

    // Get total API calls today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const apiCallsToday = await prisma.claudeApiLog.count({
      where: {
        createdAt: {
          gte: today,
        },
      },
    })

    // Get total cost today
    const costResult = await prisma.claudeApiLog.aggregate({
      _sum: {
        totalCost: true,
      },
      where: {
        createdAt: {
          gte: today,
        },
      },
    })

    const costToday = costResult._sum.totalCost?.toNumber() || 0

    // Get total entries today
    const calorieEntriesToday = await prisma.calorieEntry.count({
      where: {
        createdAt: {
          gte: today,
        },
      },
    })

    const exerciseEntriesToday = await prisma.exerciseEntry.count({
      where: {
        createdAt: {
          gte: today,
        },
      },
    })

    return NextResponse.json({
      totalUsers,
      activeUsers,
      apiCallsToday,
      costToday,
      calorieEntriesToday,
      exerciseEntriesToday,
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
