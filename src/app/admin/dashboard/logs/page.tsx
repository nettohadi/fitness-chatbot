import { prisma } from "@/lib/prisma"

async function getApiLogs(limit: number = 50) {
  const logs = await prisma.claudeApiLog.findMany({
    include: {
      user: {
        select: {
          phoneNumber: true,
          fullName: true,
          nickname: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  })

  return logs
}

async function getLogStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [totalCost, todayCost, totalLogs, todayLogs] = await Promise.all([
    prisma.claudeApiLog.aggregate({
      _sum: { totalCost: true },
    }),
    prisma.claudeApiLog.aggregate({
      _sum: { totalCost: true },
      where: { createdAt: { gte: today } },
    }),
    prisma.claudeApiLog.count(),
    prisma.claudeApiLog.count({
      where: { createdAt: { gte: today } },
    }),
  ])

  return {
    totalCost: totalCost._sum.totalCost?.toNumber() || 0,
    todayCost: todayCost._sum.totalCost?.toNumber() || 0,
    totalLogs,
    todayLogs,
  }
}

export default async function LogsPage() {
  const [logs, stats] = await Promise.all([getApiLogs(), getLogStats()])

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">API Logs</h1>
          <p className="mt-2 text-sm text-gray-700">
            Claude API usage logs and costs
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <div className="bg-white rounded-lg shadow px-4 py-3">
            <div className="text-sm text-gray-500">Total Cost</div>
            <div className="text-2xl font-bold text-gray-900">
              ${stats.totalCost.toFixed(4)}
            </div>
            <div className="text-xs text-gray-500">
              Today: ${stats.todayCost.toFixed(4)} ({stats.todayLogs} calls)
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Time
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      User
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Model
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Tokens
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Cost
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Latency
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                        <div className="text-gray-900">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        {log.user ? (
                          <>
                            <div className="text-gray-900">
                              {log.user.fullName || log.user.nickname || "No name"}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {log.user.phoneNumber}
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400">System</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {log.model}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <div className="text-gray-900">
                          {log.inputTokens + log.outputTokens} total
                        </div>
                        <div className="text-gray-500 text-xs">
                          {log.inputTokens} in / {log.outputTokens} out
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                        ${log.totalCost.toNumber().toFixed(6)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {log.latencyMs}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {logs.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">No API logs found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm text-gray-700">
          Showing latest <span className="font-medium">{logs.length}</span> log(s)
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Logs older than 7 days are automatically deleted
        </p>
      </div>
    </div>
  )
}
