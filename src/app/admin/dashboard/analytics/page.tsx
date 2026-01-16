"use client"

import { useAnalytics } from "@/lib/hooks/useAdminData"
import { CardSkeleton } from "@/components/ui/LoadingSpinner"

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string
  value: string | number
  subtitle: string
}) {
  return (
    <div className="bg-card overflow-hidden shadow rounded-lg border border-border">
      <div className="p-5">
        <div className="text-sm font-medium text-muted-foreground">{title}</div>
        <div className="mt-1 text-3xl font-semibold text-foreground">{value}</div>
        <div className="mt-2 text-sm text-muted-foreground">{subtitle}</div>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { data: analytics, isLoading, error } = useAnalytics()

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load analytics</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>

        {/* User Analytics Skeleton */}
        <div>
          <h2 className="text-lg font-medium text-foreground mb-4">
            User Analytics
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>

        {/* Entry Analytics Skeleton */}
        <div>
          <h2 className="text-lg font-medium text-foreground mb-4">
            Entry Analytics
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) return null

  return (
    <div className="space-y-8 pt-8">
      <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>

      {/* User Analytics */}
      <div>
        <h2 className="text-lg font-medium text-foreground mb-4">
          User Analytics
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Users"
            value={analytics.users.total}
            subtitle={`+${analytics.users.last7Days} this week`}
          />

          <StatCard
            title="New Users (30d)"
            value={analytics.users.last30Days}
            subtitle={`${analytics.users.total > 0 ? ((analytics.users.last30Days / analytics.users.total) * 100).toFixed(1) : 0}% of total`}
          />

          <StatCard
            title="Profile Completion"
            value={`${analytics.users.profileCompletionRate.toFixed(0)}%`}
            subtitle={`${analytics.users.completedProfiles} completed`}
          />

          <StatCard
            title="Active Users (7d)"
            value={analytics.activity.activeUsers}
            subtitle={`${analytics.activity.activeRate.toFixed(0)}% active rate`}
          />
        </div>
      </div>

      {/* Entry Analytics */}
      <div>
        <h2 className="text-lg font-medium text-foreground mb-4">
          Entry Analytics
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <StatCard
            title="Food Entries"
            value={analytics.entries.totalCalorie}
            subtitle={`${analytics.entries.last7DaysCalorie} in last 7 days`}
          />

          <StatCard
            title="Exercise Entries"
            value={analytics.entries.totalExercise}
            subtitle={`${analytics.entries.last7DaysExercise} in last 7 days`}
          />
        </div>
      </div>

      {/* API Analytics */}
      <div>
        <h2 className="text-lg font-medium text-foreground mb-4">
          API Usage Analytics
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Cost"
            value={`$${analytics.api.totalCost.toFixed(2)}`}
            subtitle="All time API costs"
          />

          <StatCard
            title="Total Tokens"
            value={(
              analytics.api.totalInputTokens + analytics.api.totalOutputTokens
            ).toLocaleString()}
            subtitle={`${analytics.api.totalInputTokens.toLocaleString()} in / ${analytics.api.totalOutputTokens.toLocaleString()} out`}
          />

          <StatCard
            title="Avg Latency"
            value={`${analytics.api.avgLatency.toFixed(0)}ms`}
            subtitle="Response time"
          />
        </div>
      </div>

      {/* Top Exercises */}
      <div>
        <h2 className="text-lg font-medium text-foreground mb-4">
          Top Exercises
        </h2>
        <div className="bg-card shadow rounded-lg border border-border">
          <ul className="divide-y divide-border">
            {analytics.topExercises.map((exercise, index) => (
              <li key={exercise.exerciseType} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="text-2xl font-bold text-muted-foreground w-8">
                      {index + 1}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-foreground capitalize">
                        {exercise.exerciseType}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {exercise._count.exerciseType} times
                  </div>
                </div>
              </li>
            ))}
            {analytics.topExercises.length === 0 && (
              <li className="px-6 py-8 text-center text-muted-foreground">
                No exercise data yet
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
