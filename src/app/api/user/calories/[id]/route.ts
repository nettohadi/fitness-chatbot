import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { updateCalorieEntry, deleteCalorieEntry } from "@/lib/db/calories"
import prisma from "@/lib/prisma"

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
    const { calories, foodDescription } = body

    // Verify the entry belongs to the user
    const existingEntry = await prisma.calorieEntry.findUnique({
      where: { id },
    })

    if (!existingEntry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }

    if (existingEntry.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const updates: { calories?: number; foodDescription?: string } = {}
    if (typeof calories === "number" && calories > 0) {
      updates.calories = calories
    }
    if (foodDescription !== undefined) {
      updates.foodDescription = foodDescription
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid updates provided" },
        { status: 400 }
      )
    }

    const result = await updateCalorieEntry(id, updates)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update entry" },
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
    console.error("Error updating calorie entry:", error)
    return NextResponse.json(
      { error: "Failed to update calorie entry" },
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
    const existingEntry = await prisma.calorieEntry.findUnique({
      where: { id },
    })

    if (!existingEntry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }

    if (existingEntry.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const result = await deleteCalorieEntry(id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to delete entry" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting calorie entry:", error)
    return NextResponse.json(
      { error: "Failed to delete calorie entry" },
      { status: 500 }
    )
  }
}
