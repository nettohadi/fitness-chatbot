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

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        nickname: true,
        phoneNumber: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get Claude API logs for this user to extract messages
    const logs = await prisma.claudeApiLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        messages: true,
        response: true,
      },
    })

    // Extract messages from logs
    const messages: Array<{
      id: string
      role: "user" | "assistant"
      content: string
      timestamp: string
    }> = []

    logs.forEach((log) => {
      // Add the assistant response first (since logs are in desc order, this will be reversed later)
      if (log.response) {
        messages.push({
          id: `${log.id}-assistant`,
          role: "assistant",
          content: log.response,
          timestamp: log.createdAt.toISOString(),
        })
      }

      const logMessages = log.messages as any[]
      if (logMessages && Array.isArray(logMessages)) {
        // Get the last user message from this log
        const lastUserMsg = [...logMessages].reverse().find((m) => m.role === "user")
        if (lastUserMsg) {
          messages.push({
            id: `${log.id}-user`,
            role: "user",
            content: lastUserMsg.content,
            timestamp: log.createdAt.toISOString(),
          })
        }
      }
    })

    return NextResponse.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        nickname: user.nickname,
        phoneNumber: user.phoneNumber,
      },
      messages,
    })
  } catch (error) {
    console.error("Error fetching user messages:", error)
    return NextResponse.json(
      { error: "Failed to fetch user messages" },
      { status: 500 }
    )
  }
}
