import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy"
  timestamp: string
  version: string
  checks: {
    database: {
      status: "up" | "down"
      latencyMs?: number
      error?: string
    }
  }
}

export async function GET() {
  const startTime = Date.now()
  const health: HealthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    checks: {
      database: {
        status: "down",
      },
    },
  }

  // Check database connection
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    health.checks.database = {
      status: "up",
      latencyMs: Date.now() - dbStart,
    }
  } catch (error) {
    health.checks.database = {
      status: "down",
      error: error instanceof Error ? error.message : "Unknown error",
    }
    health.status = "unhealthy"
  }

  const statusCode = health.status === "healthy" ? 200 : 503

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  })
}
