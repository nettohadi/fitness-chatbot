import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { updateExerciseEntry, deleteExerciseEntry } from "@/lib/db/exercises"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { exerciseType, durationMinutes, caloriesBurned } = body

    // Verify the entry belongs to the user
    const existingEntry = await prisma.exerciseEntry.findUnique({
      where: { id },
    })

    if (!existingEntry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }

    if (existingEntry.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const updates: {
      exerciseType?: string
      durationMinutes?: number
      caloriesBurned?: number
    } = {}

    if (exerciseType && typeof exerciseType === "string") {
      updates.exerciseType = exerciseType
    }
    if (typeof durationMinutes === "number" && durationMinutes > 0) {
      updates.durationMinutes = durationMinutes
    }
    if (typeof caloriesBurned === "number" && caloriesBurned > 0) {
      updates.caloriesBurned = caloriesBurned
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid updates provided" },
        { status: 400 }
      )
    }

    const result = await updateExerciseEntry(id, updates)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update entry" },
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
    console.error("Error updating exercise entry:", error)
    return NextResponse.json(
      { error: "Failed to update exercise entry" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Verify the entry belongs to the user
    const existingEntry = await prisma.exerciseEntry.findUnique({
      where: { id },
    })

    if (!existingEntry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }

    if (existingEntry.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const result = await deleteExerciseEntry(id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to delete entry" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting exercise entry:", error)
    return NextResponse.json(
      { error: "Failed to delete exercise entry" },
      { status: 500 }
    )
  }
}
