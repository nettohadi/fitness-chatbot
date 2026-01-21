"use client"

import { useState } from "react"
import { useFoodCalories } from "@/lib/hooks/useAdminData"
import { TableSkeleton, CardSkeleton } from "@/components/ui/LoadingSpinner"
import { RefreshCw, Search, Database, Bot, User } from "lucide-react"

export default function FoodCaloriesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [sourceFilter, setSourceFilter] = useState("")
  const { data, isLoading, error, refetch, isFetching } = useFoodCalories(
    page,
    50,
    search,
    sourceFilter
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load food calories</p>
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
          <h1 className="text-2xl font-semibold text-foreground">Food Calories</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cached food calorie database for consistent estimation
          </p>
        </div>
        {isLoading ? (
          <div className="mt-4 sm:mt-0 w-48">
            <CardSkeleton />
          </div>
        ) : data ? (
          <div className="mt-4 sm:mt-0 flex gap-3">
            <div className="bg-card rounded-lg shadow border border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {data.stats.totalCount}
              </div>
            </div>
            <div className="bg-card rounded-lg shadow border border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">AI</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {data.stats.aiCount}
              </div>
            </div>
            <div className="bg-card rounded-lg shadow border border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Manual</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {data.stats.manualCount}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search food name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Search
          </button>
        </form>

        <select
          value={sourceFilter}
          onChange={(e) => {
            setSourceFilter(e.target.value)
            setPage(1)
          }}
          className="px-4 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Sources</option>
          <option value="ai">AI Estimated</option>
          <option value="manual">Manual</option>
          <option value="user">User Submitted</option>
        </select>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Top Used */}
      {data?.stats.topUsed && (
        <div className="text-sm text-muted-foreground">
          Most used: <span className="font-medium text-foreground">{data.stats.topUsed.name}</span>{" "}
          ({data.stats.topUsed.count} times)
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={10} />
      ) : data ? (
        <>
          <div className="overflow-hidden shadow ring-1 ring-border rounded-lg">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">
                    Food Name
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                    Cal/100g
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                    Default Serving
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                    Source
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                    Used
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {data.foods.map((food) => (
                  <tr key={food.id} className="hover:bg-secondary/30">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                      <div className="font-medium text-foreground">{food.name}</div>
                      <div className="text-xs text-muted-foreground">{food.nameNormalized}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className="font-mono font-medium text-foreground">
                        {food.caloriesPer100g}
                      </span>
                      <span className="text-muted-foreground"> kcal</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                      {food.defaultServing}
                      {food.servingGrams && (
                        <span className="text-xs ml-1">({food.servingGrams}g)</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          food.source === "ai"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : food.source === "manual"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                        }`}
                      >
                        {food.source === "ai" && <Bot className="h-3 w-3" />}
                        {food.source === "manual" && <User className="h-3 w-3" />}
                        {food.source}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                      {food.usageCount}x
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                      {new Date(food.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.foods.length === 0 && (
              <div className="text-center py-12 bg-card">
                <p className="text-sm text-muted-foreground">
                  {search ? `No foods found matching "${search}"` : "No food calories logged yet"}
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
                  {data.pagination.total > 0 ? (page - 1) * 50 + 1 : 0}
                </span>{" "}
                to{" "}
                <span className="font-medium text-foreground">
                  {Math.min(page * 50, data.pagination.total)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {data.pagination.total}
                </span>{" "}
                foods
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
    </div>
  )
}
