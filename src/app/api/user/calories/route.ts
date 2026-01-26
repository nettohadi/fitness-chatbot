import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  addCalorieEntry,
  getDailySummary,
  getTodayDate,
} from "@/lib/db/calories"
import { getUserById } from "@/lib/db/users"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get("date")

    // Get user's timezone
    const userResult = await getUserById(session.user.id)
    const userTimezone = userResult.data?.timezone || null

    // Use provided date or default to today
    const targetDate = date || getTodayDate(userTimezone)

    const result = await getDailySummary(session.user.id, targetDate)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to fetch calories" },
        { status: 500 }
      )
    }

    // Serialize Decimal values
    const entries = result.data?.entries.map((entry) => ({
      ...entry,
      calories: Number(entry.calories),
    })) || []

    return NextResponse.json({
      date: targetDate,
      totalCalories: result.data?.totalCalories || 0,
      entryCount: result.data?.entryCount || 0,
      dailyCalorieGoal: userResult.data?.dailyCalorieGoal
        ? Number(userResult.data.dailyCalorieGoal)
        : null,
      entries,
    })
  } catch (error) {
    console.error("Error fetching calories:", error)
    return NextResponse.json(
      { error: "Failed to fetch calories" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { calories, foodDescription } = body

    if (typeof calories !== "number" || calories <= 0) {
      return NextResponse.json(
        { error: "Valid calories amount is required" },
        { status: 400 }
      )
    }

    // Get user's timezone
    const userResult = await getUserById(session.user.id)
    const userTimezone = userResult.data?.timezone || null

    const result = await addCalorieEntry(
      session.user.id,
      calories,
      foodDescription || null,
      false, // not estimated by AI when entered manually
      userTimezone
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to add calorie entry" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      entry: {
        ...result.data,
        calories: Number(result.data?.calories),
      },
    })
  } catch (error) {
    console.error("Error adding calorie entry:", error)
    return NextResponse.json(
      { error: "Failed to add calorie entry" },
      { status: 500 }
    )
  }
}
