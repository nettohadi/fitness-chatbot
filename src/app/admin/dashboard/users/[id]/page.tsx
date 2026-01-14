import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"

async function getUserDetail(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      calorieEntries: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      exerciseEntries: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: {
        select: {
          calorieEntries: true,
          exerciseEntries: true,
          claudeApiLogs: true,
        },
      },
    },
  })

  if (!user) return null

  // Get conversation logs separately
  const conversationLogs = await prisma.conversationLog.findMany({
    where: { phoneNumber: user.phoneNumber },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return { user, conversationLogs }
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getUserDetail(id)

  if (!data) {
    notFound()
  }

  const { user, conversationLogs } = data

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <Link
          href="/admin/dashboard/users"
          className="text-indigo-600 hover:text-indigo-900 text-sm"
        >
          ← Back to users
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        {user.fullName || user.nickname || "User"} Details
      </h1>

      {/* User Profile */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Profile Information
          </h3>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {user.phoneNumber}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Full Name</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {user.fullName || "N/A"}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Nickname</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {user.nickname || "N/A"}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Profile Status</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {user.profileCompleted ? (
                  <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                    Complete
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                    Incomplete
                  </span>
                )}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Physical Info</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                Age: {user.age || "N/A"}, Gender: {user.gender || "N/A"}, Weight: {user.weightKg?.toString() || "N/A"} kg, Height: {user.heightCm?.toString() || "N/A"} cm
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Calorie Goals</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                BMR: {user.bmr?.toString() || "N/A"} kcal, TDEE: {user.tdee?.toString() || "N/A"} kcal, Daily Goal: {user.dailyCalorieGoal?.toString() || "N/A"} kcal
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Activity</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {user._count.calorieEntries} food entries, {user._count.exerciseEntries} exercise entries, {user._count.claudeApiLogs} API calls
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Joined</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {new Date(user.createdAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Conversation History */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 bg-indigo-50">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Conversation History ({conversationLogs.length} messages)
          </h3>
        </div>
        <div className="border-t border-gray-200 max-h-[600px] overflow-y-auto">
          {conversationLogs.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {conversationLogs.map((log) => (
                <div key={log.id} className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.messageType === "user"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {log.messageType === "user" ? "👤 User" : "🤖 Bot"}
                      </span>
                      <span className="ml-3 text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-900 whitespace-pre-wrap pl-8">
                    {log.messageBody || <span className="text-gray-400 italic">No message content</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500">
              No conversation history found
            </div>
          )}
        </div>
      </div>

      {/* Recent Food Entries */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Food Entries (Last 10)
          </h3>
        </div>
        <div className="border-t border-gray-200">
          {user.calorieEntries.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Food</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calories</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">AI Estimated</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {user.calorieEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(entry.entryTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {entry.foodDescription || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.calories.toString()} kcal
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.estimatedByAi ? "Yes" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500">No food entries yet</div>
          )}
        </div>
      </div>

      {/* Recent Exercise Entries */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Exercise Entries (Last 10)
          </h3>
        </div>
        <div className="border-t border-gray-200">
          {user.exerciseEntries.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exercise</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calories Burned</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MET</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {user.exerciseEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(entry.entryTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                      {entry.exerciseType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.durationMinutes} min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.caloriesBurned.toString()} kcal
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.metValue?.toString() || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500">No exercise entries yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
