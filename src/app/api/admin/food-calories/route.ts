import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { normalizeFoodName } from "@/lib/services/foodCalorie"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search") || ""
    const source = searchParams.get("source") || ""

    // Build where clause
    const where: any = {}
    if (search) {
      where.name = { contains: search, mode: "insensitive" }
    }
    if (source) {
      where.source = source
    }

    // Get food calories with pagination
    const [foodsRaw, total] = await Promise.all([
      prisma.foodCalorie.findMany({
        where,
        orderBy: [{ usageCount: "desc" }, { updatedAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.foodCalorie.count({ where }),
    ])

    // Get stats
    const [totalCount, aiCount, manualCount, topUsed] = await Promise.all([
      prisma.foodCalorie.count(),
      prisma.foodCalorie.count({ where: { source: "ai" } }),
      prisma.foodCalorie.count({ where: { source: "manual" } }),
      prisma.foodCalorie.findFirst({
        orderBy: { usageCount: "desc" },
        select: { name: true, usageCount: true },
      }),
    ])

    // Serialize
    const foods = foodsRaw.map((food) => ({
      id: food.id,
      name: food.name,
      nameNormalized: food.nameNormalized,
      caloriesPer100g: food.caloriesPer100g,
      source: food.source,
      usageCount: food.usageCount,
      createdAt: food.createdAt.toISOString(),
      updatedAt: food.updatedAt.toISOString(),
    }))

    return NextResponse.json({
      foods,
      stats: {
        totalCount,
        aiCount,
        manualCount,
        topUsed: topUsed ? { name: topUsed.name, count: topUsed.usageCount } : null,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching food calories:", error)
    return NextResponse.json(
      { error: "Failed to fetch food calories" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, caloriesPer100g } = body

    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "name must be a non-empty string" },
        { status: 400 }
      )
    }

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

    const food = await prisma.foodCalorie.create({
      data: {
        name: name.trim(),
        nameNormalized: normalizeFoodName(name.trim()),
        caloriesPer100g,
        source: "manual",
      },
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
    }, { status: 201 })
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A food with this name already exists" },
        { status: 409 }
      )
    }
    console.error("Error creating food calorie:", error)
    return NextResponse.json(
      { error: "Failed to create food calorie" },
      { status: 500 }
    )
  }
}
