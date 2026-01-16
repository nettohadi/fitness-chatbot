"use client"

import { useState } from "react"
import { useLogs } from "@/lib/hooks/useAdminData"
import { TableSkeleton, CardSkeleton } from "@/components/ui/LoadingSpinner"
import LogRow from "@/components/admin/LogRow"
import SlidePanel from "@/components/ui/SlidePanel"
import LogDetailPanel from "@/components/admin/LogDetailPanel"
import { RefreshCw } from "lucide-react"

export default function LogsPage() {
  const [page, setPage] = useState(1)
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)
  const { data, isLoading, error, refetch, isFetching } = useLogs(page, 50)

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load logs</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pt-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">API Logs</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Claude API usage logs and costs
          </p>
        </div>
        {isLoading ? (
          <div className="mt-4 sm:mt-0 w-48">
            <CardSkeleton />
          </div>
        ) : data ? (
          <div className="mt-4 sm:mt-0">
            <div className="bg-card rounded-lg shadow border border-border px-4 py-3">
              <div className="text-sm text-muted-foreground">Total Cost</div>
              <div className="text-2xl font-bold text-foreground">
                ${data.stats.totalCost.toFixed(4)}
              </div>
              <div className="text-xs text-muted-foreground">
                Today: ${data.stats.todayCost.toFixed(4)} ({data.stats.todayLogs}{" "}
                calls)
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={10} />
      ) : data ? (
        <>
          <div className="overflow-hidden shadow ring-1 ring-border rounded-lg">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">
                    Time
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                    User
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                    Model
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                    Tokens
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                    Cost
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                    Latency
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {data.logs.map((log) => (
                  <LogRow
                    key={log.id}
                    log={log}
                    onClick={(logId) => setSelectedLogId(logId)}
                  />
                ))}
              </tbody>
            </table>

            {data.logs.length === 0 && (
              <div className="text-center py-12 bg-card">
                <p className="text-sm text-muted-foreground">No API logs found</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {(page - 1) * 50 + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium text-foreground">
                  {Math.min(page * 50, data.pagination.total)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {data.pagination.total}
                </span>{" "}
                logs
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Logs older than 7 days are automatically deleted
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.pagination.totalPages}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : null}

      {/* Log Detail Slide Panel */}
      <SlidePanel
        isOpen={!!selectedLogId}
        onClose={() => setSelectedLogId(null)}
        title="API Log Details"
        width="w-[700px]"
      >
        {selectedLogId && <LogDetailPanel logId={selectedLogId} />}
      </SlidePanel>
    </div>
  )
}
