import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Utensils, Dumbbell, User, ArrowRight } from "lucide-react"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user.name || "User"}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/dashboard/calories"
          className="flex items-center justify-between p-6 bg-card border border-border rounded-lg hover:bg-secondary/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <Utensils className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Calories</h3>
              <p className="text-sm text-muted-foreground">
                Manage food entries
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </Link>

        <Link
          href="/dashboard/exercises"
          className="flex items-center justify-between p-6 bg-card border border-border rounded-lg hover:bg-secondary/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Dumbbell className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Exercises</h3>
              <p className="text-sm text-muted-foreground">
                Track workouts
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </Link>

        <Link
          href="/dashboard/profile"
          className="flex items-center justify-between p-6 bg-card border border-border rounded-lg hover:bg-secondary/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <User className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Profile</h3>
              <p className="text-sm text-muted-foreground">
                Update your info
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      </div>

      {/* Placeholder for summary - will be implemented in Phase 5 */}
      <div className="p-6 bg-card border border-border rounded-lg">
        <p className="text-muted-foreground text-center">
          Daily summary coming soon...
        </p>
      </div>
    </div>
  )
}
