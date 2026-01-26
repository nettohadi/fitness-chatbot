"use client"

import { useState, useEffect, FormEvent } from "react"
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Clock,
  Flame,
} from "lucide-react"
import Modal from "@/components/ui/Modal"

interface ExerciseEntry {
  id: string
  exerciseType: string
  durationMinutes: number
  caloriesBurned: number
  metValue: number | null
  entryDate: string
  entryTime: string
  createdAt: string
}

interface DayData {
  date: string
  totalCaloriesBurned: number
  exerciseCount: number
  exercises: ExerciseEntry[]
}

const COMMON_EXERCISES = [
  "Walking",
  "Running",
  "Cycling",
  "Swimming",
  "Weight Training",
  "Yoga",
  "HIIT",
  "Dancing",
  "Jump Rope",
  "Stretching",
]

export default function ExercisesPage() {
  const [data, setData] = useState<DayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split("T")[0]
  })

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [addExerciseType, setAddExerciseType] = useState("")
  const [addDuration, setAddDuration] = useState("")
  const [addCalories, setAddCalories] = useState("")
  const [addLoading, setAddLoading] = useState(false)

  // Edit modal state
  const [editEntry, setEditEntry] = useState<ExerciseEntry | null>(null)
  const [editExerciseType, setEditExerciseType] = useState("")
  const [editDuration, setEditDuration] = useState("")
  const [editCalories, setEditCalories] = useState("")
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
      const response = await fetch(`/api/user/exercises?date=${selectedDate}`)
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
      const response = await fetch("/api/user/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseType: addExerciseType,
          durationMinutes: parseInt(addDuration),
          caloriesBurned: parseFloat(addCalories),
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        setError(result.error || "Failed to add entry")
        setAddLoading(false)
        return
      }

      setAddExerciseType("")
      setAddDuration("")
      setAddCalories("")
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
      const response = await fetch(`/api/user/exercises/${editEntry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseType: editExerciseType,
          durationMinutes: parseInt(editDuration),
          caloriesBurned: parseFloat(editCalories),
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
      const response = await fetch(`/api/user/exercises/${deleteId}`, {
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

  const openEditModal = (entry: ExerciseEntry) => {
    setEditEntry(entry)
    setEditExerciseType(entry.exerciseType)
    setEditDuration(entry.durationMinutes.toString())
    setEditCalories(entry.caloriesBurned.toString())
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

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const isToday = selectedDate === new Date().toISOString().split("T")[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Exercises</h1>
          <p className="text-muted-foreground">Track your workouts</p>
        </div>
        {isToday && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Exercise
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
          {isToday && <p className="text-sm text-primary">Today</p>}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Flame className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Calories Burned</p>
                <p className="text-2xl font-bold text-foreground">
                  {Math.round(data.totalCaloriesBurned)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Dumbbell className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Workouts</p>
                <p className="text-2xl font-bold text-foreground">
                  {data.exerciseCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      {/* Exercises List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : data?.exercises.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No exercises for this day</p>
          {isToday && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 text-primary hover:underline"
            >
              Log your first workout
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {data?.exercises.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-4 bg-card border border-border rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {entry.exerciseType}
                </p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(entry.durationMinutes)}
                  </span>
                  <span>{formatTime(entry.entryTime)}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-bold text-green-600 dark:text-green-400">
                    -{Math.round(entry.caloriesBurned)} cal
                  </p>
                </div>
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

      {/* Add Exercise Modal */}
      <Modal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        title="Add Exercise"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Exercise Type *
            </label>
            <input
              type="text"
              value={addExerciseType}
              onChange={(e) => setAddExerciseType(e.target.value)}
              required
              list="exercise-types"
              className="appearance-none relative block w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
              placeholder="e.g., Running, Weight Training"
            />
            <datalist id="exercise-types">
              {COMMON_EXERCISES.map((ex) => (
                <option key={ex} value={ex} />
              ))}
            </datalist>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Duration (minutes) *
              </label>
              <input
                type="number"
                value={addDuration}
                onChange={(e) => setAddDuration(e.target.value)}
                required
                min="1"
                step="1"
                className="appearance-none relative block w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                placeholder="30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Calories Burned *
              </label>
              <input
                type="number"
                value={addCalories}
                onChange={(e) => setAddCalories(e.target.value)}
                required
                min="1"
                step="1"
                className="appearance-none relative block w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                placeholder="200"
              />
            </div>
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
              disabled={addLoading || !addExerciseType || !addDuration || !addCalories}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {addLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add Exercise"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Exercise Modal */}
      <Modal
        isOpen={!!editEntry}
        onClose={() => setEditEntry(null)}
        title="Edit Exercise"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Exercise Type *
            </label>
            <input
              type="text"
              value={editExerciseType}
              onChange={(e) => setEditExerciseType(e.target.value)}
              required
              list="exercise-types-edit"
              className="appearance-none relative block w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            />
            <datalist id="exercise-types-edit">
              {COMMON_EXERCISES.map((ex) => (
                <option key={ex} value={ex} />
              ))}
            </datalist>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Duration (minutes) *
              </label>
              <input
                type="number"
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
                required
                min="1"
                step="1"
                className="appearance-none relative block w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Calories Burned *
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
              disabled={
                editLoading || !editExerciseType || !editDuration || !editCalories
              }
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
        title="Delete Exercise"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Are you sure you want to delete this exercise? This action cannot be
            undone.
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
