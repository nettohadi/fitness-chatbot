"use client"

import { useDashboardStats } from "@/lib/hooks/useAdminData"
import StatsCard from "@/components/admin/StatsCard"
import { CardSkeleton } from "@/components/ui/LoadingSpinner"
import Link from "next/link"

export default function AdminDashboardPage() {
  const { data: stats, isLoading, error } = useDashboardStats()

  if (isLoading) {
    return (
      <div className="space-y-6 pt-8">
        <h1 className="text-2xl font-semibold text-foreground">
          Dashboard Overview
        </h1>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load dashboard stats</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6 pt-8">
      <h1 className="text-2xl font-semibold text-foreground">
        Dashboard Overview
      </h1>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers.toString()}
          description={`${stats.activeUsers} active in last 7 days`}
          icon="👥"
        />

        <StatsCard
          title="API Calls Today"
          value={stats.apiCallsToday.toString()}
          description={`$${stats.costToday.toFixed(4)} spent`}
          icon="📊"
        />

        <StatsCard
          title="Entries Today"
          value={(stats.calorieEntriesToday + stats.exerciseEntriesToday).toString()}
          description={`${stats.calorieEntriesToday} food, ${stats.exerciseEntriesToday} exercise`}
          icon="📝"
        />
      </div>

      <div className="bg-card overflow-hidden shadow rounded-lg border border-border">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-foreground mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              href="/admin/dashboard/users"
              className="block p-4 border border-border rounded-lg hover:bg-secondary/50 transition"
            >
              <h3 className="text-sm font-medium text-foreground">
                View All Users
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse and manage user accounts
              </p>
            </Link>

            <Link
              href="/admin/dashboard/logs"
              className="block p-4 border border-border rounded-lg hover:bg-secondary/50 transition"
            >
              <h3 className="text-sm font-medium text-foreground">
                View API Logs
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Monitor Claude API usage and costs
              </p>
            </Link>

            <Link
              href="/admin/dashboard/analytics"
              className="block p-4 border border-border rounded-lg hover:bg-secondary/50 transition"
            >
              <h3 className="text-sm font-medium text-foreground">
                View Analytics
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Analyze usage patterns and trends
              </p>
            </Link>

            <a
              href="/api/cron/cleanup"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 border border-border rounded-lg hover:bg-secondary/50 transition"
            >
              <h3 className="text-sm font-medium text-foreground">
                Run Cleanup Job
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Clean up old logs and expired OTPs
              </p>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
