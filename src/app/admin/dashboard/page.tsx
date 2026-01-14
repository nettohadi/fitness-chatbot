import { prisma } from "@/lib/prisma"
import StatsCard from "@/components/admin/StatsCard"

async function getDashboardStats() {
  // Get total users
  const totalUsers = await prisma.user.count()

  // Get active users (users with activity in last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const activeUsers = await prisma.user.count({
    where: {
      OR: [
        {
          calorieEntries: {
            some: {
              createdAt: {
                gte: sevenDaysAgo,
              },
            },
          },
        },
        {
          exerciseEntries: {
            some: {
              createdAt: {
                gte: sevenDaysAgo,
              },
            },
          },
        },
      ],
    },
  })

  // Get total API calls today
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const apiCallsToday = await prisma.claudeApiLog.count({
    where: {
      createdAt: {
        gte: today,
      },
    },
  })

  // Get total cost today
  const costResult = await prisma.claudeApiLog.aggregate({
    _sum: {
      totalCost: true,
    },
    where: {
      createdAt: {
        gte: today,
      },
    },
  })

  const costToday = costResult._sum.totalCost?.toNumber() || 0

  // Get total entries today
  const calorieEntriesToday = await prisma.calorieEntry.count({
    where: {
      createdAt: {
        gte: today,
      },
    },
  })

  const exerciseEntriesToday = await prisma.exerciseEntry.count({
    where: {
      createdAt: {
        gte: today,
      },
    },
  })

  return {
    totalUsers,
    activeUsers,
    apiCallsToday,
    costToday,
    calorieEntriesToday,
    exerciseEntriesToday,
  }
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats()

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
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

      <div className="mt-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <a
                href="/admin/dashboard/users"
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <h3 className="text-sm font-medium text-gray-900">
                  View All Users
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Browse and manage user accounts
                </p>
              </a>

              <a
                href="/admin/dashboard/logs"
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <h3 className="text-sm font-medium text-gray-900">
                  View API Logs
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Monitor Claude API usage and costs
                </p>
              </a>

              <a
                href="/admin/dashboard/analytics"
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <h3 className="text-sm font-medium text-gray-900">
                  View Analytics
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Analyze usage patterns and trends
                </p>
              </a>

              <a
                href="/api/cron/cleanup"
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <h3 className="text-sm font-medium text-gray-900">
                  Run Cleanup Job
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Clean up old logs and expired OTPs
                </p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
