import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getUserById, updateUserProfile } from "@/lib/db/users"
import { calculateFitnessMetrics } from "@/lib/services/bmrCalculator"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await getUserById(session.user.id)

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ user: result.data })
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Check if we need to recalculate fitness metrics
    const metricsFields = ["age", "gender", "weightKg", "heightCm", "activityLevel"]
    const needsRecalculation = metricsFields.some((field) => body[field] !== undefined)

    let updateData = { ...body }

    if (needsRecalculation) {
      // Get current user data to fill in missing fields
      const userResult = await getUserById(session.user.id)
      if (!userResult.success || !userResult.data) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        )
      }

      const currentUser = userResult.data

      // Merge current values with updates
      const age = body.age ?? currentUser.age
      const gender = body.gender ?? currentUser.gender
      const weightKg = body.weightKg ?? (currentUser.weightKg ? Number(currentUser.weightKg) : null)
      const heightCm = body.heightCm ?? (currentUser.heightCm ? Number(currentUser.heightCm) : null)
      const activityLevel = body.activityLevel ?? currentUser.activityLevel

      // Only recalculate if we have all required fields
      if (age && gender && weightKg && heightCm && activityLevel) {
        const metrics = calculateFitnessMetrics(
          age,
          gender,
          weightKg,
          heightCm,
          activityLevel
        )

        updateData = {
          ...updateData,
          bmr: metrics.bmr,
          tdee: metrics.tdee,
          dailyCalorieGoal: body.dailyCalorieGoal ?? metrics.dailyCalorieGoal,
        }
      }
    }

    const result = await updateUserProfile(session.user.id, updateData)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update profile" },
        { status: 400 }
      )
    }

    return NextResponse.json({ user: result.data })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
}
