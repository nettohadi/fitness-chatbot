import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { normalizeFoodName } from "@/lib/services/foodCalorie"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { caloriesPer100g, name } = body

    // Validate: at least one field must be provided
    if (caloriesPer100g === undefined && name === undefined) {
      return NextResponse.json(
        { error: "At least one of caloriesPer100g or name must be provided" },
        { status: 400 }
      )
    }

    const data: Record<string, any> = { source: "manual" }

    if (caloriesPer100g !== undefined) {
      if (
        typeof caloriesPer100g !== "number" ||
        !Number.isInteger(caloriesPer100g) ||
        caloriesPer100g <= 0
      ) {
        return NextResponse.json(
          { error: "caloriesPer100g must be a positive integer" },
          { status: 400 }
        )
      }
      data.caloriesPer100g = caloriesPer100g
    }

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "name must be a non-empty string" },
          { status: 400 }
        )
      }
      data.name = name.trim()
      data.nameNormalized = normalizeFoodName(name.trim())
    }

    const food = await prisma.foodCalorie.update({
      where: { id },
      data,
    })

    return NextResponse.json({
      id: food.id,
      name: food.name,
      nameNormalized: food.nameNormalized,
      caloriesPer100g: food.caloriesPer100g,
      source: food.source,
      usageCount: food.usageCount,
      createdAt: food.createdAt.toISOString(),
      updatedAt: food.updatedAt.toISOString(),
    })
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json(
        { error: "Food calorie entry not found" },
        { status: 404 }
      )
    }
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A food with this name already exists" },
        { status: 409 }
      )
    }
    console.error("Error updating food calorie:", error)
    return NextResponse.json(
      { error: "Failed to update food calorie" },
      { status: 500 }
    )
  }
}
