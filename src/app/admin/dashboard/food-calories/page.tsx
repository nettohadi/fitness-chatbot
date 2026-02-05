"use client"

import { useState, useRef, useEffect } from "react"
import { useFoodCalories, useUpdateFoodCalorie } from "@/lib/hooks/useAdminData"
import { TableSkeleton, CardSkeleton } from "@/components/ui/LoadingSpinner"
import { RefreshCw, Search, Database, Bot, User, Pencil, Check, X, Loader2 } from "lucide-react"

function InlineCalorieEdit({
  foodId,
  currentValue,
}: {
  foodId: string
  currentValue: number
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentValue.toString())
  const [flash, setFlash] = useState<"success" | "error" | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const updateMutation = useUpdateFoodCalorie()

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  useEffect(() => {
    setValue(currentValue.toString())
  }, [currentValue])

  const handleSave = () => {
    const parsed = parseInt(value, 10)
    if (!parsed || parsed <= 0 || parsed === currentValue) {
      setEditing(false)
      setValue(currentValue.toString())
      return
    }

    updateMutation.mutate(
      { id: foodId, caloriesPer100g: parsed },
      {
        onSuccess: () => {
          setEditing(false)
          setFlash("success")
          setTimeout(() => setFlash(null), 1500)
        },
        onError: () => {
          setFlash("error")
          setValue(currentValue.toString())
          setEditing(false)
          setTimeout(() => setFlash(null), 1500)
        },
      }
    )
  }

  const handleCancel = () => {
    setValue(currentValue.toString())
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave()
    if (e.key === "Escape") handleCancel()
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="number"
          min="1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={updateMutation.isPending}
          className="w-20 px-2 py-1 text-sm font-mono border border-primary rounded bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {updateMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <>
            <button
              onClick={handleSave}
              className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`group inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 -ml-1.5 transition-colors hover:bg-secondary ${
        flash === "success"
          ? "bg-green-100 dark:bg-green-900/30"
          : flash === "error"
          ? "bg-red-100 dark:bg-red-900/30"
          : ""
      }`}
    >
      <span className="font-mono font-medium text-foreground">
        {currentValue}
      </span>
      <span className="text-muted-foreground"> kcal</span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}

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
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {data.foods.map((food) => (
              <div
                key={food.id}
                className="bg-card rounded-lg shadow border border-border p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-foreground">{food.name}</div>
                    <div className="text-xs text-muted-foreground">{food.nameNormalized}</div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium shrink-0 ${
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
                </div>
                <div className="flex items-center justify-between text-sm">
                  <InlineCalorieEdit
                    foodId={food.id}
                    currentValue={food.caloriesPer100g}
                  />
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>{food.usageCount}x used</span>
                    <span>{new Date(food.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden shadow ring-1 ring-border rounded-lg">
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
                      <InlineCalorieEdit
                        foodId={food.id}
                        currentValue={food.caloriesPer100g}
                      />
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
          </div>

          {data.foods.length === 0 && (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">
                {search ? `No foods found matching "${search}"` : "No food calories logged yet"}
              </p>
            </div>
          )}

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
