"use client"

import { useRouter } from "next/navigation"

interface LogRowProps {
  log: {
    id: string
    createdAt: string
    model: string
    inputTokens: number
    outputTokens: number
    totalCost: number
    latencyMs: number
    user: {
      phoneNumber: string
      fullName: string | null
      nickname: string | null
    } | null
  }
}

export default function LogRow({ log }: LogRowProps) {
  const router = useRouter()

  return (
    <tr
      key={log.id}
      className="hover:bg-gray-50 cursor-pointer"
      onClick={() => router.push(`/admin/dashboard/logs/${log.id}`)}
    >
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
            <div className="text-gray-500 text-xs">{log.user.phoneNumber}</div>
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
        ${log.totalCost.toFixed(6)}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
        {log.latencyMs}ms
      </td>
    </tr>
  )
}
