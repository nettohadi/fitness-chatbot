import { prisma } from "@/lib/prisma"
import LogRow from "@/components/admin/LogRow"

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
  const [logsRaw, stats] = await Promise.all([getApiLogs(), getLogStats()])

  // Serialize logs for client component (convert Decimal and Date to plain types)
  const logs = logsRaw.map((log) => ({
    id: log.id,
    createdAt: log.createdAt.toISOString(),
    model: log.model,
    inputTokens: log.inputTokens,
    outputTokens: log.outputTokens,
    totalCost: log.totalCost.toNumber(),
    latencyMs: log.latencyMs,
    user: log.user,
  }))

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
                    <LogRow key={log.id} log={log} />
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
