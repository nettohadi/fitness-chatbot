"use client"

import { TodayData } from "@/lib/hooks/useTodayData"
import CircularProgress from "@/components/ui/CircularProgress"
import StatBox from "@/components/ui/StatBox"

interface OverviewTabProps {
  data: TodayData
}

export default function OverviewTab({ data }: OverviewTabProps) {
  const { user, today } = data
  const dailyGoal = user.dailyCalorieGoal || 0
  const consumed = today.totalCaloriesConsumed
  const burned = today.totalCaloriesBurned
  // Daily goal = TDEE - deficit target + calories burned
  const todayGoal = dailyGoal + burned
  const remaining = todayGoal - consumed
  const percentage = todayGoal > 0 ? (consumed / todayGoal) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Pie Chart */}
      <div className="flex justify-center">
        <CircularProgress percentage={percentage} />
      </div>

      {/* Calorie Summary */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox value={consumed} label="Consumed" />
        <StatBox value={burned} label="Burned" variant="success" />
        <StatBox value={todayGoal} label="Today's Goal" />
        <StatBox
          value={remaining}
          label="Remaining"
          variant={remaining < 0 ? "warning" : "info"}
        />
      </div>

      {/* User Stats */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Your Stats</h4>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-muted-foreground">BMR</dt>
            <dd className="font-medium text-foreground">
              {user.bmr ? `${Math.round(user.bmr)} kcal` : "N/A"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">TDEE</dt>
            <dd className="font-medium text-foreground">
              {user.tdee ? `${Math.round(user.tdee)} kcal` : "N/A"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Deficit Target</dt>
            <dd className="font-medium text-foreground">
              {user.deficitTarget ? `${Math.round(user.deficitTarget)} kcal` : "N/A"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Weight</dt>
            <dd className="font-medium text-foreground">
              {user.weightKg ? `${user.weightKg} kg` : "N/A"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Quick Summary */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <div className="text-muted-foreground">Food Entries</div>
          <div className="text-lg font-semibold text-foreground">
            {today.calorieEntries.length}
          </div>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <div className="text-muted-foreground">Exercise Entries</div>
          <div className="text-lg font-semibold text-foreground">
            {today.exerciseEntries.length}
          </div>
        </div>
      </div>
    </div>
  )
}
