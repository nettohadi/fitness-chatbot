"use client"

import { useState } from "react"
import { Loader2, RefreshCw, LayoutDashboard, Utensils, Dumbbell } from "lucide-react"
import { useTodayData } from "@/lib/hooks/useTodayData"
import OverviewTab from "./OverviewTab"
import FoodsTab from "./FoodsTab"
import ExercisesTab from "./ExercisesTab"

type TabType = "overview" | "foods" | "exercises"

const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "foods", label: "Foods", icon: Utensils },
  { id: "exercises", label: "Exercises", icon: Dumbbell },
]

export default function TodayPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview")
  const { data, isLoading, error, refetch, isFetching } = useTodayData()

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mt-2 text-muted-foreground">Loading today&apos;s data...</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load today&apos;s data</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : "Please try again"}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  const userName = data.user.fullName || data.user.nickname || "User"

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {userName}&apos;s Today
          </h1>
          <p className="text-sm text-muted-foreground">{data.today.date}</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 rounded-lg hover:bg-secondary/50 transition-colors disabled:opacity-50"
          title="Refresh data"
        >
          <RefreshCw
            className={`h-5 w-5 text-muted-foreground ${isFetching ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                isActive
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === "overview" && <OverviewTab data={data} />}
        {activeTab === "foods" && <FoodsTab entries={data.today.calorieEntries} />}
        {activeTab === "exercises" && <ExercisesTab entries={data.today.exerciseEntries} />}
      </div>
    </div>
  )
}
