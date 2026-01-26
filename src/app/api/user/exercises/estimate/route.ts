import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  calculateCaloriesBurned,
  findExerciseType,
  getMetValue,
} from "@/lib/services/exerciseTracker"

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { exerciseType, durationMinutes } = body

    if (!exerciseType || typeof exerciseType !== "string") {
      return NextResponse.json(
        { error: "Exercise type is required" },
        { status: 400 }
      )
    }

    if (!durationMinutes || typeof durationMinutes !== "number" || durationMinutes <= 0) {
      return NextResponse.json(
        { error: "Duration (in minutes) is required and must be positive" },
        { status: 400 }
      )
    }

    // Get user's weight for calculation
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { weightKg: true },
    })

    // Default weight if not set
    const weightKg = user?.weightKg?.toNumber() || 70

    // Find matching exercise type and get MET value
    const matchedExercise = findExerciseType(exerciseType)
    const metValue = getMetValue(exerciseType)

    // Calculate calories burned
    const result = calculateCaloriesBurned(
      exerciseType.toLowerCase().trim(),
      durationMinutes,
      weightKg
    )

    return NextResponse.json({
      caloriesBurned: result.calories,
      metValue: result.metValue,
      matchedExercise,
      weightUsed: weightKg,
    })
  } catch (error) {
    console.error("Error estimating exercise calories:", error)
    return NextResponse.json(
      { error: "Failed to calculate calories burned" },
      { status: 500 }
    )
  }
}
