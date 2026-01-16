import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    const where = search
      ? {
          OR: [
            { phoneNumber: { contains: search } },
            { fullName: { contains: search, mode: "insensitive" as const } },
            { nickname: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          phoneNumber: true,
          fullName: true,
          nickname: true,
          profileCompleted: true,
          createdAt: true,
          age: true,
          gender: true,
          weightKg: true,
          heightCm: true,
          dailyCalorieGoal: true,
          timezone: true,
          _count: {
            select: {
              calorieEntries: true,
              exerciseEntries: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    // Serialize decimal values
    const serializedUsers = users.map((user) => ({
      ...user,
      weightKg: user.weightKg?.toNumber() || null,
      heightCm: user.heightCm?.toNumber() || null,
      dailyCalorieGoal: user.dailyCalorieGoal?.toNumber() || null,
      createdAt: user.createdAt.toISOString(),
    }))

    return NextResponse.json({
      users: serializedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}
