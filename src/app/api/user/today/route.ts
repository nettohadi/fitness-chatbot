import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const userId = session.user.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        nickname: true,
        bmr: true,
        tdee: true,
        dailyCalorieGoal: true,
        deficitTarget: true,
        weightKg: true,
        timezone: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get today's date in user's timezone
    const timezone = user.timezone || process.env.APP_TIMEZONE || "Asia/Jakarta"
    const now = new Date()
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    const todayStr = formatter.format(now)

    // Parse the date string and create start/end of day
    const [year, month, day] = todayStr.split("-").map(Number)
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))

    // Get today's calorie entries
    const calorieEntries = await prisma.calorieEntry.findMany({
      where: {
        userId,
        entryDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { entryTime: "desc" },
    })

    // Get today's exercise entries
    const exerciseEntries = await prisma.exerciseEntry.findMany({
      where: {
        userId,
        entryDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { entryTime: "desc" },
    })

    // Calculate totals
    const totalCaloriesConsumed = calorieEntries.reduce(
      (sum, entry) => sum + entry.calories.toNumber(),
      0
    )
    const totalCaloriesBurned = exerciseEntries.reduce(
      (sum, entry) => sum + (entry.caloriesBurned?.toNumber() || 0),
      0
    )

    return NextResponse.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        nickname: user.nickname,
        bmr: user.bmr?.toNumber() || null,
        tdee: user.tdee?.toNumber() || null,
        dailyCalorieGoal: user.dailyCalorieGoal?.toNumber() || null,
        deficitTarget: user.deficitTarget?.toNumber() || null,
        weightKg: user.weightKg?.toNumber() || null,
      },
      today: {
        date: todayStr,
        totalCaloriesConsumed: Math.round(totalCaloriesConsumed),
        totalCaloriesBurned: Math.round(totalCaloriesBurned),
        netCalories: Math.round(totalCaloriesConsumed - totalCaloriesBurned),
        calorieEntries: calorieEntries.map((entry) => ({
          id: entry.id,
          calories: Math.round(entry.calories.toNumber()),
          foodDescription: entry.foodDescription,
          estimatedByAi: entry.estimatedByAi,
          entryTime: entry.entryTime.toISOString(),
        })),
        exerciseEntries: exerciseEntries.map((entry) => ({
          id: entry.id,
          exerciseType: entry.exerciseType,
          durationMinutes: entry.durationMinutes,
          caloriesBurned: Math.round(entry.caloriesBurned?.toNumber() || 0),
          metValue: entry.metValue?.toNumber() || null,
          entryTime: entry.entryTime.toISOString(),
        })),
      },
    })
  } catch (error) {
    console.error("Error fetching today status:", error)
    return NextResponse.json(
      { error: "Failed to fetch today status" },
      { status: 500 }
    )
  }
}
