"use client"

import { useUserTodayStatus } from "@/lib/hooks/useAdminData"
import { Loader2, RefreshCw } from "lucide-react"

interface TodayStatusPanelProps {
  userId: string
}

export default function TodayStatusPanel({ userId }: TodayStatusPanelProps) {
  const { data, isLoading, error, refetch, isFetching } = useUserTodayStatus(userId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading today&apos;s status...</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load today&apos;s status</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : "Data not found"}
        </p>
      </div>
    )
  }

  const { user, today } = data
  const dailyGoal = user.dailyCalorieGoal || 0
  const consumed = today.totalCaloriesConsumed
  const burned = today.totalCaloriesBurned
  const remaining = dailyGoal - consumed + burned
  const totalQuote = dailyGoal + burned
  const percentage = dailyGoal > 0 ? Math.min((consumed / totalQuote) * 100, 100) : 0

  // SVG Pie chart calculations
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const handleRefresh = () => {
    refetch()
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div className="flex-1" /> {/* Spacer */}
        <div className="text-center flex-1">
          <h3 className="text-lg font-medium text-foreground">
            {user.fullName || user.nickname || "User"}&apos;s Today
          </h3>
          <p className="text-sm text-muted-foreground">{today.date}</p>
        </div>
        <div className="flex-1 flex justify-end">
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="p-2 rounded-lg hover:bg-secondary/50 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`h-5 w-5 text-muted-foreground ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="flex justify-center">
        <div className="relative">
          <svg width="200" height="200" className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="16"
              className="text-secondary"
            />
            {/* Progress circle */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="16"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={percentage >= 100 ? "text-red-500" : "text-primary"}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground">{Math.round(percentage)}%</span>
            <span className="text-sm text-muted-foreground">of goal</span>
          </div>
        </div>
      </div>

      {/* Calorie Summary */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="bg-secondary/30 rounded-lg p-3">
          <div className="text-2xl font-bold text-foreground">{consumed}</div>
          <div className="text-xs text-muted-foreground">Consumed</div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-400">{burned}</div>
          <div className="text-xs text-muted-foreground">Burned</div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-3">
          <div className="text-2xl font-bold text-foreground">{dailyGoal}</div>
          <div className="text-xs text-muted-foreground">Daily Goal</div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-3">
          <div className={`text-2xl font-bold ${remaining < 0 ? "text-red-400" : "text-blue-400"}`}>
            {remaining}
          </div>
          <div className="text-xs text-muted-foreground">Remaining</div>
        </div>
      </div>

      {/* User Stats */}
      <div className="bg-secondary/30 rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3">User Stats</h4>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-muted-foreground">BMR</dt>
            <dd className="font-medium text-foreground">{user.bmr || "N/A"} kcal</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">TDEE</dt>
            <dd className="font-medium text-foreground">{user.tdee || "N/A"} kcal</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Deficit Target</dt>
            <dd className="font-medium text-foreground">{user.deficitTarget || "N/A"} kcal</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Weight</dt>
            <dd className="font-medium text-foreground">{user.weightKg || "N/A"} kg</dd>
          </div>
        </dl>
      </div>

      {/* Today's Food */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 bg-secondary/30 border-b border-border">
          <h4 className="text-sm font-medium text-foreground">
            Today&apos;s Food ({today.calorieEntries.length})
          </h4>
        </div>
        <div className="max-h-48 overflow-y-auto">
          {today.calorieEntries.length > 0 ? (
            <ul className="divide-y divide-border">
              {today.calorieEntries.map((entry) => (
                <li key={entry.id} className="px-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-foreground">
                        {entry.foodDescription || "No description"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.entryTime).toLocaleTimeString()}
                        {entry.estimatedByAi && " • AI estimated"}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {entry.calories} kcal
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No food entries today
            </div>
          )}
        </div>
      </div>

      {/* Today's Exercise */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 bg-secondary/30 border-b border-border">
          <h4 className="text-sm font-medium text-foreground">
            Today&apos;s Exercise ({today.exerciseEntries.length})
          </h4>
        </div>
        <div className="max-h-48 overflow-y-auto">
          {today.exerciseEntries.length > 0 ? (
            <ul className="divide-y divide-border">
              {today.exerciseEntries.map((entry) => (
                <li key={entry.id} className="px-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-foreground capitalize">{entry.exerciseType}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.durationMinutes} min • {new Date(entry.entryTime).toLocaleTimeString()}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-green-400">
                      -{entry.caloriesBurned || 0} kcal
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No exercise entries today
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
