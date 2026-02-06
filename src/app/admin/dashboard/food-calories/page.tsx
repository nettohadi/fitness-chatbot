"use client"

import { useState, useRef, useEffect } from "react"
import { useFoodCalories, useUpdateFoodCalorie, useCreateFoodCalorie } from "@/lib/hooks/useAdminData"
import { TableSkeleton, CardSkeleton } from "@/components/ui/LoadingSpinner"
import { RefreshCw, Search, Database, Bot, User, Pencil, Check, X, Loader2, Plus } from "lucide-react"

function InlineEdit({
  value: initialValue,
  onSave,
  isPending,
  type = "text",
  className = "",
  inputClassName = "",
}: {
  value: string
  onSave: (value: string) => void
  isPending: boolean
  type?: "text" | "number"
  className?: string
  inputClassName?: string
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialValue)
  const [flash, setFlash] = useState<"success" | "error" | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  const handleSave = () => {
    const trimmed = value.trim()
    if (!trimmed || trimmed === initialValue) {
      setEditing(false)
      setValue(initialValue)
      return
    }
    if (type === "number") {
      const parsed = parseInt(trimmed, 10)
      if (!parsed || parsed <= 0) {
        setEditing(false)
        setValue(initialValue)
        return
      }
    }
    onSave(trimmed)
    setEditing(false)
    setFlash("success")
    setTimeout(() => setFlash(null), 1500)
  }

  const handleCancel = () => {
    setValue(initialValue)
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
          type={type}
          min={type === "number" ? "1" : undefined}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          className={`px-2 py-1 text-sm border border-primary rounded bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${inputClassName}`}
        />
        {isPending ? (
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
      } ${className}`}
    >
      <span className="text-foreground">{initialValue}</span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity" />
    </button>
  )
}

function AddFoodForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("")
  const [calories, setCalories] = useState("")
  const nameRef = useRef<HTMLInputElement>(null)
  const createMutation = useCreateFoodCalorie()

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    const parsedCalories = parseInt(calories, 10)
    if (!trimmedName || !parsedCalories || parsedCalories <= 0) return

    createMutation.mutate(
      { name: trimmedName, caloriesPer100g: parsedCalories },
      {
        onSuccess: () => {
          setName("")
          setCalories("")
          onClose()
        },
      }
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose()
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className="bg-card rounded-lg shadow border-2 border-primary/30 p-4 space-y-3"
    >
      <div className="text-sm font-medium text-foreground">Add New Food</div>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          ref={nameRef}
          type="text"
          placeholder="Food name (e.g. Nasi goreng)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={createMutation.isPending}
          className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          type="number"
          placeholder="Cal/100g"
          min="1"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          disabled={createMutation.isPending}
          className="w-full sm:w-32 px-3 py-2 text-sm font-mono border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={createMutation.isPending || !name.trim() || !calories}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border bg-card text-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        </div>
      </div>
      {createMutation.isError && (
        <p className="text-sm text-destructive">
          {createMutation.error instanceof Error ? createMutation.error.message : "Failed to create"}
        </p>
      )}
    </form>
  )
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
        source === "ai"
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          : source === "manual"
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
      }`}
    >
      {source === "ai" && <Bot className="h-3 w-3" />}
      {source === "manual" && <User className="h-3 w-3" />}
      {source}
    </span>
  )
}

export default function FoodCaloriesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [sourceFilter, setSourceFilter] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const { data, isLoading, error, refetch, isFetching } = useFoodCalories(
    page,
    50,
    search,
    sourceFilter
  )
  const updateMutation = useUpdateFoodCalorie()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleUpdateName = (foodId: string, newName: string) => {
    updateMutation.mutate({ id: foodId, name: newName })
  }

  const handleUpdateCalories = (foodId: string, newCalories: string) => {
    const parsed = parseInt(newCalories, 10)
    if (parsed && parsed > 0) {
      updateMutation.mutate({ id: foodId, caloriesPer100g: parsed })
    }
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

      {/* Search, Filter, and Add */}
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
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Food
        </button>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Add Food Form */}
      {showAddForm && (
        <AddFoodForm onClose={() => setShowAddForm(false)} />
      )}

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
                  <div className="min-w-0 flex-1">
                    <InlineEdit
                      value={food.name}
                      onSave={(v) => handleUpdateName(food.id, v)}
                      isPending={updateMutation.isPending}
                      className="font-medium"
                      inputClassName="w-full"
                    />
                    <div className="text-xs text-muted-foreground mt-0.5">{food.nameNormalized}</div>
                  </div>
                  <SourceBadge source={food.source} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <InlineEdit
                    value={food.caloriesPer100g.toString()}
                    onSave={(v) => handleUpdateCalories(food.id, v)}
                    isPending={updateMutation.isPending}
                    type="number"
                    className="font-mono"
                    inputClassName="w-20"
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
                    <td className="py-4 pl-4 pr-3 sm:pl-6">
                      <InlineEdit
                        value={food.name}
                        onSave={(v) => handleUpdateName(food.id, v)}
                        isPending={updateMutation.isPending}
                        className="font-medium"
                        inputClassName="w-64"
                      />
                      <div className="text-xs text-muted-foreground">{food.nameNormalized}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <InlineEdit
                        value={food.caloriesPer100g.toString()}
                        onSave={(v) => handleUpdateCalories(food.id, v)}
                        isPending={updateMutation.isPending}
                        type="number"
                        className="font-mono"
                        inputClassName="w-20"
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <SourceBadge source={food.source} />
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
