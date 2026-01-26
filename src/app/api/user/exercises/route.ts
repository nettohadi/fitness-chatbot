import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  addExerciseEntry,
  getExerciseSummaryByDateRange,
} from "@/lib/db/exercises"
import { getTodayDate } from "@/lib/db/calories"
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

    const result = await getExerciseSummaryByDateRange(
      session.user.id,
      targetDate,
      targetDate
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to fetch exercises" },
        { status: 500 }
      )
    }

    // Serialize Decimal values
    const exercises = result.data?.exercises.map((exercise) => ({
      ...exercise,
      caloriesBurned: exercise.caloriesBurned
        ? Number(exercise.caloriesBurned)
        : 0,
      metValue: exercise.metValue ? Number(exercise.metValue) : null,
    })) || []

    return NextResponse.json({
      date: targetDate,
      totalCaloriesBurned: result.data?.totalCalories || 0,
      exerciseCount: result.data?.exerciseCount || 0,
      exercises,
    })
  } catch (error) {
    console.error("Error fetching exercises:", error)
    return NextResponse.json(
      { error: "Failed to fetch exercises" },
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
    const { exerciseType, durationMinutes, caloriesBurned } = body

    if (!exerciseType || typeof exerciseType !== "string") {
      return NextResponse.json(
        { error: "Exercise type is required" },
        { status: 400 }
      )
    }

    if (typeof durationMinutes !== "number" || durationMinutes <= 0) {
      return NextResponse.json(
        { error: "Valid duration in minutes is required" },
        { status: 400 }
      )
    }

    if (typeof caloriesBurned !== "number" || caloriesBurned <= 0) {
      return NextResponse.json(
        { error: "Valid calories burned is required" },
        { status: 400 }
      )
    }

    // Get user's timezone
    const userResult = await getUserById(session.user.id)
    const userTimezone = userResult.data?.timezone || null

    const result = await addExerciseEntry(
      session.user.id,
      exerciseType,
      durationMinutes,
      caloriesBurned,
      undefined, // metValue - optional
      userTimezone
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to add exercise entry" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      entry: {
        ...result.data,
        caloriesBurned: result.data?.caloriesBurned
          ? Number(result.data.caloriesBurned)
          : 0,
        metValue: result.data?.metValue ? Number(result.data.metValue) : null,
      },
    })
  } catch (error) {
    console.error("Error adding exercise entry:", error)
    return NextResponse.json(
      { error: "Failed to add exercise entry" },
      { status: 500 }
    )
  }
}
