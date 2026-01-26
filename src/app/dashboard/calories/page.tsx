"use client"

import { useState, useEffect, FormEvent } from "react"
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Utensils,
} from "lucide-react"
import Modal from "@/components/ui/Modal"

interface CalorieEntry {
  id: string
  calories: number
  foodDescription: string | null
  estimatedByAi: boolean
  entryDate: string
  entryTime: string
  createdAt: string
}

interface DayData {
  date: string
  totalCalories: number
  entryCount: number
  dailyCalorieGoal: number | null
  entries: CalorieEntry[]
}

export default function CaloriesPage() {
  const [data, setData] = useState<DayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split("T")[0]
  })

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [addCalories, setAddCalories] = useState("")
  const [addDescription, setAddDescription] = useState("")
  const [addLoading, setAddLoading] = useState(false)

  // Edit modal state
  const [editEntry, setEditEntry] = useState<CalorieEntry | null>(null)
  const [editCalories, setEditCalories] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editLoading, setEditLoading] = useState(false)

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  const fetchData = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/user/calories?date=${selectedDate}`)
      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "Failed to load data")
        setLoading(false)
        return
      }

      setData(result)
      setLoading(false)
    } catch (err) {
      setError("Failed to load data")
      setLoading(false)
    }
  }

  const handleDateChange = (direction: "prev" | "next") => {
    const current = new Date(selectedDate)
    if (direction === "prev") {
      current.setDate(current.getDate() - 1)
    } else {
      current.setDate(current.getDate() + 1)
    }
    setSelectedDate(current.toISOString().split("T")[0])
  }

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    setAddLoading(true)

    try {
      const response = await fetch("/api/user/calories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calories: parseFloat(addCalories),
          foodDescription: addDescription || null,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        setError(result.error || "Failed to add entry")
        setAddLoading(false)
        return
      }

      setAddCalories("")
      setAddDescription("")
      setShowAddForm(false)
      setAddLoading(false)
      fetchData()
    } catch (err) {
      setError("Failed to add entry")
      setAddLoading(false)
    }
  }

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editEntry) return

    setEditLoading(true)

    try {
      const response = await fetch(`/api/user/calories/${editEntry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calories: parseFloat(editCalories),
          foodDescription: editDescription || null,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        setError(result.error || "Failed to update entry")
        setEditLoading(false)
        return
      }

      setEditEntry(null)
      setEditLoading(false)
      fetchData()
    } catch (err) {
      setError("Failed to update entry")
      setEditLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    setDeleteLoading(true)

    try {
      const response = await fetch(`/api/user/calories/${deleteId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const result = await response.json()
        setError(result.error || "Failed to delete entry")
        setDeleteLoading(false)
        return
      }

      setDeleteId(null)
      setDeleteLoading(false)
      fetchData()
    } catch (err) {
      setError("Failed to delete entry")
      setDeleteLoading(false)
    }
  }

  const openEditModal = (entry: CalorieEntry) => {
    setEditEntry(entry)
    setEditCalories(entry.calories.toString())
    setEditDescription(entry.foodDescription || "")
  }

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00")
    return date.toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const isToday = selectedDate === new Date().toISOString().split("T")[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calories</h1>
          <p className="text-muted-foreground">Track your daily food intake</p>
        </div>
        {isToday && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Entry
          </button>
        )}
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-card border border-border rounded-lg p-4">
        <button
          onClick={() => handleDateChange("prev")}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="font-semibold text-foreground">{formatDate(selectedDate)}</p>
          {isToday && (
            <p className="text-sm text-primary">Today</p>
          )}
        </div>
        <button
          onClick={() => handleDateChange("next")}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
          disabled={isToday}
        >
          <ChevronRight className={`h-5 w-5 ${isToday ? "opacity-30" : ""}`} />
        </button>
      </div>

      {/* Summary Card */}
      {data && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Total Calories</p>
              <p className="text-2xl font-bold text-foreground">
                {Math.round(data.totalCalories)}
              </p>
            </div>
            {data.dailyCalorieGoal && (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Daily Goal</p>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.round(data.dailyCalorieGoal)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p
                    className={`text-2xl font-bold ${
                      data.dailyCalorieGoal - data.totalCalories >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-destructive"
                    }`}
                  >
                    {Math.round(data.dailyCalorieGoal - data.totalCalories)}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Progress Bar */}
          {data.dailyCalorieGoal && (
            <div className="mt-4">
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    data.totalCalories > data.dailyCalorieGoal
                      ? "bg-destructive"
                      : "bg-primary"
                  }`}
                  style={{
                    width: `${Math.min(
                      (data.totalCalories / data.dailyCalorieGoal) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {Math.round((data.totalCalories / data.dailyCalorieGoal) * 100)}% of
                daily goal
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      {/* Entries List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : data?.entries.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <Utensils className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No entries for this day</p>
          {isToday && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 text-primary hover:underline"
            >
              Add your first entry
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {data?.entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-4 bg-card border border-border rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {entry.foodDescription || "Food entry"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(entry.entryTime)}
                  {entry.estimatedByAi && (
                    <span className="ml-2 text-xs bg-secondary px-2 py-0.5 rounded">
                      AI estimated
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-bold text-foreground">
                  {Math.round(entry.calories)} cal
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(entry)}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => setDeleteId(entry.id)}
                    className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Entry Modal */}
      <Modal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        title="Add Calorie Entry"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Calories *
            </label>
            <input
              type="number"
              value={addCalories}
              onChange={(e) => setAddCalories(e.target.value)}
              required
              min="1"
              step="1"
              className="appearance-none relative block w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
              placeholder="Enter calories"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Description
            </label>
            <input
              type="text"
              value={addDescription}
              onChange={(e) => setAddDescription(e.target.value)}
              className="appearance-none relative block w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
              placeholder="What did you eat?"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="flex-1 py-3 px-4 border border-border rounded-lg text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addLoading || !addCalories}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {addLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add Entry"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Entry Modal */}
      <Modal
        isOpen={!!editEntry}
        onClose={() => setEditEntry(null)}
        title="Edit Calorie Entry"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Calories *
            </label>
            <input
              type="number"
              value={editCalories}
              onChange={(e) => setEditCalories(e.target.value)}
              required
              min="1"
              step="1"
              className="appearance-none relative block w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Description
            </label>
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="appearance-none relative block w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditEntry(null)}
              className="flex-1 py-3 px-4 border border-border rounded-lg text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editLoading || !editCalories}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {editLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Entry"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Are you sure you want to delete this entry? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteId(null)}
              className="flex-1 py-3 px-4 border border-border rounded-lg text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {deleteLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
