import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        calorieEntries: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        exerciseEntries: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        _count: {
          select: {
            calorieEntries: true,
            exerciseEntries: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Serialize decimal values and dates
    const serializedUser = {
      ...user,
      weightKg: user.weightKg?.toNumber() || null,
      heightCm: user.heightCm?.toNumber() || null,
      dailyCalorieGoal: user.dailyCalorieGoal?.toNumber() || null,
      deficitTarget: user.deficitTarget?.toNumber() || null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      calorieEntries: user.calorieEntries.map((entry) => ({
        ...entry,
        calories: entry.calories.toNumber(),
        createdAt: entry.createdAt.toISOString(),
        entryDate: entry.entryDate.toISOString(),
        entryTime: entry.entryTime.toISOString(),
      })),
      exerciseEntries: user.exerciseEntries.map((entry) => ({
        ...entry,
        durationMinutes: entry.durationMinutes,
        caloriesBurned: entry.caloriesBurned?.toNumber() || null,
        metValue: entry.metValue?.toNumber() || null,
        createdAt: entry.createdAt.toISOString(),
        entryDate: entry.entryDate.toISOString(),
        entryTime: entry.entryTime.toISOString(),
      })),
    }

    return NextResponse.json(serializedUser)
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    )
  }
}
