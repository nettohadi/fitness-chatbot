"use client"

import { useUser } from "@/lib/hooks/useAdminData"
import { PageLoader } from "@/components/ui/LoadingSpinner"
import Link from "next/link"
import { use } from "react"

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: user, isLoading, error } = useUser(id)

  if (isLoading) {
    return <PageLoader text="Loading user details..." />
  }

  if (error || !user) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load user details</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : "User not found"}
        </p>
        <Link
          href="/admin/dashboard/users"
          className="text-primary hover:text-primary/80 text-sm mt-4 inline-block"
        >
          ← Back to users
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 pt-8">
      <div>
        <Link
          href="/admin/dashboard/users"
          className="text-primary hover:text-primary/80 text-sm"
        >
          ← Back to users
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-foreground">
        {user.fullName || user.nickname || "User"} Details
      </h1>

      {/* User Profile */}
      <div className="bg-card shadow overflow-hidden rounded-lg border border-border">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-foreground">
            Profile Information
          </h3>
        </div>
        <div className="border-t border-border">
          <dl>
            <div className="bg-secondary/30 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-muted-foreground">Phone Number</dt>
              <dd className="mt-1 text-sm text-foreground sm:mt-0 sm:col-span-2">
                {user.phoneNumber}
              </dd>
            </div>
            <div className="bg-card px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-muted-foreground">Full Name</dt>
              <dd className="mt-1 text-sm text-foreground sm:mt-0 sm:col-span-2">
                {user.fullName || "N/A"}
              </dd>
            </div>
            <div className="bg-secondary/30 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-muted-foreground">Nickname</dt>
              <dd className="mt-1 text-sm text-foreground sm:mt-0 sm:col-span-2">
                {user.nickname || "N/A"}
              </dd>
            </div>
            <div className="bg-card px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-muted-foreground">Profile Status</dt>
              <dd className="mt-1 text-sm text-foreground sm:mt-0 sm:col-span-2">
                {user.profileCompleted ? (
                  <span className="inline-flex rounded-full bg-green-500/20 px-2 py-1 text-xs font-semibold text-green-400">
                    Complete
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-yellow-500/20 px-2 py-1 text-xs font-semibold text-yellow-400">
                    Incomplete
                  </span>
                )}
              </dd>
            </div>
            <div className="bg-secondary/30 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-muted-foreground">Timezone</dt>
              <dd className="mt-1 text-sm text-foreground sm:mt-0 sm:col-span-2">
                {user.timezone || "Not set"}
              </dd>
            </div>
            <div className="bg-card px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-muted-foreground">Physical Info</dt>
              <dd className="mt-1 text-sm text-foreground sm:mt-0 sm:col-span-2">
                Age: {user.age || "N/A"}, Gender: {user.gender || "N/A"}, Weight: {user.weightKg || "N/A"} kg, Height: {user.heightCm || "N/A"} cm
              </dd>
            </div>
            <div className="bg-secondary/30 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-muted-foreground">Calorie Goals</dt>
              <dd className="mt-1 text-sm text-foreground sm:mt-0 sm:col-span-2">
                BMR: {user.bmr || "N/A"} kcal, TDEE: {user.tdee || "N/A"} kcal, Daily Goal: {user.dailyCalorieGoal || "N/A"} kcal
              </dd>
            </div>
            <div className="bg-card px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-muted-foreground">Activity</dt>
              <dd className="mt-1 text-sm text-foreground sm:mt-0 sm:col-span-2">
                {user._count.calorieEntries} food entries, {user._count.exerciseEntries} exercise entries
              </dd>
            </div>
            <div className="bg-secondary/30 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-muted-foreground">Joined</dt>
              <dd className="mt-1 text-sm text-foreground sm:mt-0 sm:col-span-2">
                {new Date(user.createdAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>

    </div>
  )
}
