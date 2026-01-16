"use client"

import { useLog } from "@/lib/hooks/useAdminData"
import { Loader2 } from "lucide-react"

interface LogDetailPanelProps {
  logId: string
}

export default function LogDetailPanel({ logId }: LogDetailPanelProps) {
  const { data: log, isLoading, error } = useLog(logId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading log details...</span>
      </div>
    )
  }

  if (error || !log) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load log details</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : "Log not found"}
        </p>
      </div>
    )
  }

  const messages = (log.messages || []) as any[]

  const completePrompt = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SYSTEM PROMPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${log.systemPrompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONVERSATION HISTORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${messages.map((msg: any) =>
  `[${msg.role.toUpperCase()}]:\n${msg.content}`
).join('\n\n---\n\n')}`

  return (
    <div className="space-y-6">
      {/* Metadata */}
      <div className="bg-secondary/30 rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">Request Information</h3>
        </div>
        <dl className="divide-y divide-border">
          <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-muted-foreground">Time</dt>
            <dd className="mt-1 text-sm text-foreground sm:mt-0 sm:col-span-2">
              {new Date(log.createdAt).toLocaleString()}
            </dd>
          </div>
          <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-muted-foreground">User</dt>
            <dd className="mt-1 text-sm text-foreground sm:mt-0 sm:col-span-2">
              {log.user ? (
                <>
                  <div>{log.user.fullName || log.user.nickname || "No name"}</div>
                  <div className="text-muted-foreground">{log.user.phoneNumber}</div>
                </>
              ) : (
                "System"
              )}
            </dd>
          </div>
          <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-muted-foreground">Model</dt>
            <dd className="mt-1 text-sm text-foreground sm:mt-0 sm:col-span-2">
              {log.model}
            </dd>
          </div>
          <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-muted-foreground">Tokens</dt>
            <dd className="mt-1 text-sm text-foreground sm:mt-0 sm:col-span-2">
              {log.inputTokens + log.outputTokens} total ({log.inputTokens} in / {log.outputTokens} out)
            </dd>
          </div>
          <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-muted-foreground">Cost</dt>
            <dd className="mt-1 text-sm text-foreground sm:mt-0 sm:col-span-2">
              ${log.totalCost.toFixed(6)}
            </dd>
          </div>
          <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-muted-foreground">Latency</dt>
            <dd className="mt-1 text-sm text-foreground sm:mt-0 sm:col-span-2">
              {log.latencyMs}ms
            </dd>
          </div>
        </dl>
      </div>

      {/* Complete Prompt */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 bg-primary/10 border-b border-border flex justify-between items-center">
          <h3 className="text-sm font-medium text-foreground">
            Complete Prompt Sent to Claude
          </h3>
          <span className="text-xs text-muted-foreground">
            System + History + Message
          </span>
        </div>
        <div className="p-4">
          <pre className="whitespace-pre-wrap text-xs text-foreground bg-secondary/50 p-4 rounded overflow-x-auto max-h-[300px] overflow-y-auto font-mono border border-border">
            {completePrompt}
          </pre>
        </div>
      </div>

      {/* Response */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 bg-green-500/10 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">
            Claude Response
          </h3>
        </div>
        <div className="p-4">
          <pre className="whitespace-pre-wrap text-sm text-foreground bg-secondary/50 p-4 rounded font-mono border border-border">
            {log.response}
          </pre>
        </div>
      </div>
    </div>
  )
}
