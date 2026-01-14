import { prisma } from "@/lib/prisma"

async function getAnalytics() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // User growth stats
  const [totalUsers, last30DaysUsers, last7DaysUsers, completedProfiles] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.user.count({
        where: { profileCompleted: true },
      }),
    ])

  // Entry stats
  const [totalCalorieEntries, totalExerciseEntries, entriesLast7Days] =
    await Promise.all([
      prisma.calorieEntry.count(),
      prisma.exerciseEntry.count(),
      Promise.all([
        prisma.calorieEntry.count({
          where: { createdAt: { gte: sevenDaysAgo } },
        }),
        prisma.exerciseEntry.count({
          where: { createdAt: { gte: sevenDaysAgo } },
        }),
      ]),
    ])

  // API usage stats
  const apiStats = await prisma.claudeApiLog.aggregate({
    _sum: {
      inputTokens: true,
      outputTokens: true,
      totalCost: true,
    },
    _avg: {
      latencyMs: true,
    },
  })

  // Top exercis types
  const topExercises = await prisma.exerciseEntry.groupBy({
    by: ["exerciseType"],
    _count: {
      exerciseType: true,
    },
    orderBy: {
      _count: {
        exerciseType: "desc",
      },
    },
    take: 5,
  })

  // User activity distribution
  const activeUsers = await prisma.user.count({
    where: {
      OR: [
        {
          calorieEntries: {
            some: {
              createdAt: { gte: sevenDaysAgo },
            },
          },
        },
        {
          exerciseEntries: {
            some: {
              createdAt: { gte: sevenDaysAgo },
            },
          },
        },
      ],
    },
  })

  return {
    users: {
      total: totalUsers,
      last30Days: last30DaysUsers,
      last7Days: last7DaysUsers,
      completedProfiles,
      profileCompletionRate: totalUsers > 0 ? (completedProfiles / totalUsers) * 100 : 0,
    },
    entries: {
      totalCalorie: totalCalorieEntries,
      totalExercise: totalExerciseEntries,
      last7DaysCalorie: entriesLast7Days[0],
      last7DaysExercise: entriesLast7Days[1],
    },
    api: {
      totalCost: apiStats._sum.totalCost?.toNumber() || 0,
      totalInputTokens: apiStats._sum.inputTokens || 0,
      totalOutputTokens: apiStats._sum.outputTokens || 0,
      avgLatency: apiStats._avg.latencyMs || 0,
    },
    topExercises,
    activity: {
      activeUsers,
      activeRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
    },
  }
}

export default async function AnalyticsPage() {
  const analytics = await getAnalytics()

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Analytics</h1>

      {/* User Analytics */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          User Analytics
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-sm font-medium text-gray-500">
                Total Users
              </div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">
                {analytics.users.total}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                +{analytics.users.last7Days} this week
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-sm font-medium text-gray-500">
                New Users (30d)
              </div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">
                {analytics.users.last30Days}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                {((analytics.users.last30Days / analytics.users.total) * 100).toFixed(1)}% of total
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-sm font-medium text-gray-500">
                Profile Completion
              </div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">
                {analytics.users.profileCompletionRate.toFixed(0)}%
              </div>
              <div className="mt-2 text-sm text-gray-500">
                {analytics.users.completedProfiles} completed
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-sm font-medium text-gray-500">
                Active Users (7d)
              </div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">
                {analytics.activity.activeUsers}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                {analytics.activity.activeRate.toFixed(0)}% active rate
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Entry Analytics */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Entry Analytics
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-sm font-medium text-gray-500">
                Food Entries
              </div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">
                {analytics.entries.totalCalorie}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                {analytics.entries.last7DaysCalorie} in last 7 days
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-sm font-medium text-gray-500">
                Exercise Entries
              </div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">
                {analytics.entries.totalExercise}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                {analytics.entries.last7DaysExercise} in last 7 days
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Analytics */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          API Usage Analytics
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-sm font-medium text-gray-500">
                Total Cost
              </div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">
                ${analytics.api.totalCost.toFixed(2)}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                All time API costs
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-sm font-medium text-gray-500">
                Total Tokens
              </div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">
                {(analytics.api.totalInputTokens + analytics.api.totalOutputTokens).toLocaleString()}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                {analytics.api.totalInputTokens.toLocaleString()} in / {analytics.api.totalOutputTokens.toLocaleString()} out
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-sm font-medium text-gray-500">
                Avg Latency
              </div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">
                {analytics.api.avgLatency.toFixed(0)}ms
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Response time
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Exercises */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Top Exercises
        </h2>
        <div className="bg-white shadow rounded-lg">
          <ul className="divide-y divide-gray-200">
            {analytics.topExercises.map((exercise, index) => (
              <li key={exercise.exerciseType} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="text-2xl font-bold text-gray-400 w-8">
                      {index + 1}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 capitalize">
                        {exercise.exerciseType}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {exercise._count.exerciseType} times
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
