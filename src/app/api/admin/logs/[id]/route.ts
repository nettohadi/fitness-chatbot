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

    const log = await prisma.claudeApiLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            phoneNumber: true,
            fullName: true,
            nickname: true,
          },
        },
      },
    })

    if (!log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 })
    }

    // Serialize log
    const serializedLog = {
      id: log.id,
      createdAt: log.createdAt.toISOString(),
      model: log.model,
      systemPrompt: log.systemPrompt,
      messages: log.messages,
      response: log.response,
      inputTokens: log.inputTokens,
      outputTokens: log.outputTokens,
      totalCost: log.totalCost.toNumber(),
      latencyMs: log.latencyMs,
      user: log.user,
    }

    return NextResponse.json(serializedLog)
  } catch (error) {
    console.error("Error fetching log:", error)
    return NextResponse.json(
      { error: "Failed to fetch log" },
      { status: 500 }
    )
  }
}
