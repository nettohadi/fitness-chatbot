"use client"

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
  onClick?: (logId: string) => void
}

export default function LogRow({ log, onClick }: LogRowProps) {
  return (
    <tr
      key={log.id}
      className="hover:bg-secondary/50 cursor-pointer transition-colors"
      onClick={() => onClick?.(log.id)}
    >
      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
        <div className="text-foreground">
          {new Date(log.createdAt).toLocaleTimeString()}
        </div>
        <div className="text-muted-foreground text-xs">
          {new Date(log.createdAt).toLocaleDateString()}
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm">
        {log.user ? (
          <>
            <div className="text-foreground">
              {log.user.fullName || log.user.nickname || "No name"}
            </div>
            <div className="text-muted-foreground text-xs">{log.user.phoneNumber}</div>
          </>
        ) : (
          <span className="text-muted-foreground">System</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
        {log.model}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm">
        <div className="text-foreground">
          {log.inputTokens + log.outputTokens} total
        </div>
        <div className="text-muted-foreground text-xs">
          {log.inputTokens} in / {log.outputTokens} out
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-foreground">
        ${log.totalCost.toFixed(6)}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
        {log.latencyMs}ms
      </td>
    </tr>
  )
}
