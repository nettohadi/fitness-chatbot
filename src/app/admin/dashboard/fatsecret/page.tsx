"use client"

import { useState } from "react"
import { useFatSecretLogs, FatSecretLogEntry } from "@/lib/hooks/useAdminData"
import { TableSkeleton, CardSkeleton } from "@/components/ui/LoadingSpinner"
import SlidePanel from "@/components/ui/SlidePanel"
import { RefreshCw, Search, AlertCircle, CheckCircle, Clock } from "lucide-react"

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function LogRow({
  log,
  onClick,
}: {
  log: FatSecretLogEntry
  onClick: (log: FatSecretLogEntry) => void
}) {
  const hasError = !!log.errorMessage
  const noResults = log.resultCount === 0 && !hasError

  return (
    <tr
      onClick={() => onClick(log)}
      className="hover:bg-secondary/50 cursor-pointer transition-colors"
    >
      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-muted-foreground sm:pl-6">
        {formatDate(log.createdAt)}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-foreground">
        {log.searchQuery}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm">
        {hasError ? (
          <span className="inline-flex items-center gap-1 text-destructive">
            <AlertCircle className="h-4 w-4" />
            Error
          </span>
        ) : noResults ? (
          <span className="text-muted-foreground">No results</span>
        ) : (
          <span className="text-foreground">{log.resultCount} results</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground">
        {log.topResult || "-"}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground">
        {log.calPer100g ? `${log.calPer100g} kcal` : "-"}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
        {log.latencyMs}ms
      </td>
    </tr>
  )
}

function LogDetailPanel({ log }: { log: FatSecretLogEntry }) {
  return (
    <div className="space-y-6 p-4">
      {/* Status */}
      <div>
        {log.errorMessage ? (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Error</span>
          </div>
        ) : log.resultCount === 0 ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Search className="h-5 w-5" />
            <span className="font-medium">No Results</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Success</span>
          </div>
        )}
      </div>

      {/* Search Query */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Search Query
        </h3>
        <p className="text-lg font-medium text-foreground">{log.searchQuery}</p>
      </div>

      {/* Timestamp & Latency */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            Timestamp
          </h3>
          <p className="text-sm text-foreground">
            {new Date(log.createdAt).toLocaleString()}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            Latency
          </h3>
          <p className="text-sm text-foreground flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {log.latencyMs}ms
          </p>
        </div>
      </div>

      {/* Error Message */}
      {log.errorMessage && (
        <div>
          <h3 className="text-sm font-medium text-destructive mb-2">
            Error Message
          </h3>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm text-destructive font-mono">
              {log.errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* Top Result */}
      {log.topResult && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Top Result
          </h3>
          <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
            <p className="font-medium text-foreground">{log.topResult}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Calories:</span>{" "}
                <span className="text-foreground">
                  {log.topCalories} kcal per {log.topServing}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Per 100g:</span>{" "}
                <span className="text-foreground font-medium">
                  {log.calPer100g ? `${log.calPer100g} kcal` : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Response */}
      {log.responseJson && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Full Response ({log.resultCount} results)
          </h3>
          <div className="bg-secondary/50 rounded-lg p-4 max-h-80 overflow-auto">
            <pre className="text-xs text-foreground font-mono whitespace-pre-wrap">
              {JSON.stringify(log.responseJson, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FatSecretLogsPage() {
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [errorsOnly, setErrorsOnly] = useState(false)
  const [selectedLog, setSelectedLog] = useState<FatSecretLogEntry | null>(null)

  const { data, isLoading, error, refetch, isFetching } = useFatSecretLogs(
    page,
    50,
    searchQuery || undefined,
    errorsOnly
  )

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load FatSecret logs</p>
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
          <h1 className="text-2xl font-semibold text-foreground">
            FatSecret API Logs
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Food calorie lookup API calls and responses
          </p>
        </div>
        {isLoading ? (
          <div className="mt-4 sm:mt-0 w-64">
            <CardSkeleton />
          </div>
        ) : data ? (
          <div className="mt-4 sm:mt-0 flex gap-3">
            <div className="bg-card rounded-lg shadow border border-border px-4 py-3">
              <div className="text-sm text-muted-foreground">Today</div>
              <div className="text-2xl font-bold text-foreground">
                {data.stats.todayLogs}
              </div>
              <div className="text-xs text-muted-foreground">calls</div>
            </div>
            <div className="bg-card rounded-lg shadow border border-border px-4 py-3">
              <div className="text-sm text-muted-foreground">Avg Latency</div>
              <div className="text-2xl font-bold text-foreground">
                {data.stats.avgLatency}
              </div>
              <div className="text-xs text-muted-foreground">ms</div>
            </div>
            <div className="bg-card rounded-lg shadow border border-border px-4 py-3">
              <div className="text-sm text-muted-foreground">Errors</div>
              <div className="text-2xl font-bold text-destructive">
                {data.stats.errorLogs}
              </div>
              <div className="text-xs text-muted-foreground">total</div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by food query..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={errorsOnly}
            onChange={(e) => {
              setErrorsOnly(e.target.checked)
              setPage(1)
            }}
            className="rounded border-border"
          />
          <span className="text-sm text-foreground">Errors only</span>
        </label>
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
                    Query
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                    Status
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                    Top Result
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                    Per 100g
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                    Latency
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {data.logs.map((log) => (
                  <LogRow key={log.id} log={log} onClick={setSelectedLog} />
                ))}
              </tbody>
            </table>

            {data.logs.length === 0 && (
              <div className="text-center py-12 bg-card">
                <p className="text-sm text-muted-foreground">
                  No FatSecret logs found
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {data.logs.length > 0 ? (page - 1) * 50 + 1 : 0}
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
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="FatSecret Log Details"
        width="w-[600px]"
      >
        {selectedLog && <LogDetailPanel log={selectedLog} />}
      </SlidePanel>
    </div>
  )
}
