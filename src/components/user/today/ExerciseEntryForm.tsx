"use client"

import { useState, useEffect } from "react"
import { Loader2, Calculator } from "lucide-react"
import Modal from "@/components/ui/Modal"
import {
  ExerciseEntry,
  useAddExerciseEntry,
  useUpdateExerciseEntry,
  useEstimateExercise,
} from "@/lib/hooks/useTodayData"

interface ExerciseEntryFormProps {
  isOpen: boolean
  onClose: () => void
  entry?: ExerciseEntry | null
}

const COMMON_EXERCISES = [
  "walking",
  "running",
  "cycling",
  "swimming",
  "gym",
  "yoga",
  "hiit",
  "basketball",
  "soccer",
  "tennis",
  "badminton",
  "dancing",
  "hiking",
  "jump rope",
  "boxing",
]

export default function ExerciseEntryForm({ isOpen, onClose, entry }: ExerciseEntryFormProps) {
  const [exerciseType, setExerciseType] = useState("")
  const [durationMinutes, setDurationMinutes] = useState("")
  const [caloriesBurned, setCaloriesBurned] = useState("")
  const [metValue, setMetValue] = useState<number | null>(null)
  const [estimateError, setEstimateError] = useState("")

  const addEntry = useAddExerciseEntry()
  const updateEntry = useUpdateExerciseEntry()
  const estimateExercise = useEstimateExercise()

  const isEditing = !!entry

  // Reset form when modal opens/closes or entry changes
  useEffect(() => {
    if (isOpen) {
      if (entry) {
        setExerciseType(entry.exerciseType)
        setDurationMinutes(entry.durationMinutes.toString())
        setCaloriesBurned(entry.caloriesBurned.toString())
        setMetValue(entry.metValue)
      } else {
        setExerciseType("")
        setDurationMinutes("")
        setCaloriesBurned("")
        setMetValue(null)
      }
      setEstimateError("")
    }
  }, [isOpen, entry])

  const handleEstimate = async () => {
    if (!exerciseType.trim() || !durationMinutes) {
      setEstimateError("Please enter exercise type and duration first")
      return
    }

    const duration = parseInt(durationMinutes)
    if (isNaN(duration) || duration <= 0) {
      setEstimateError("Please enter a valid duration")
      return
    }

    setEstimateError("")
    try {
      const result = await estimateExercise.mutateAsync({
        exerciseType: exerciseType.trim(),
        durationMinutes: duration,
      })
      setCaloriesBurned(result.caloriesBurned.toString())
      setMetValue(result.metValue)
    } catch (error) {
      setEstimateError(error instanceof Error ? error.message : "Failed to calculate calories")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const duration = parseInt(durationMinutes)
    const calories = parseInt(caloriesBurned)

    if (isNaN(duration) || duration <= 0 || isNaN(calories) || calories <= 0) {
      return
    }

    try {
      if (isEditing && entry) {
        await updateEntry.mutateAsync({
          id: entry.id,
          data: {
            exerciseType: exerciseType.trim(),
            durationMinutes: duration,
            caloriesBurned: calories,
          },
        })
      } else {
        await addEntry.mutateAsync({
          exerciseType: exerciseType.trim(),
          durationMinutes: duration,
          caloriesBurned: calories,
          metValue: metValue || undefined,
        })
      }
      onClose()
    } catch (error) {
      console.error("Failed to save entry:", error)
    }
  }

  const isLoading = addEntry.isPending || updateEntry.isPending
  const isEstimating = estimateExercise.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Exercise Entry" : "Add Exercise Entry"}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Exercise Type */}
        <div>
          <label
            htmlFor="exerciseType"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Exercise Type
          </label>
          <input
            id="exerciseType"
            type="text"
            value={exerciseType}
            onChange={(e) => setExerciseType(e.target.value)}
            placeholder="e.g., running, cycling, gym"
            list="exercise-suggestions"
            required
            className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isLoading}
          />
          <datalist id="exercise-suggestions">
            {COMMON_EXERCISES.map((exercise) => (
              <option key={exercise} value={exercise} />
            ))}
          </datalist>
        </div>

        {/* Duration */}
        <div>
          <label
            htmlFor="durationMinutes"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Duration (minutes)
          </label>
          <input
            id="durationMinutes"
            type="number"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            placeholder="Enter duration"
            min="1"
            required
            className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        {/* Calories Burned with Calculate Button */}
        <div>
          <label
            htmlFor="caloriesBurned"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Calories Burned
          </label>
          <div className="flex gap-2">
            <input
              id="caloriesBurned"
              type="number"
              value={caloriesBurned}
              onChange={(e) => {
                setCaloriesBurned(e.target.value)
                setMetValue(null)
              }}
              placeholder="Enter calories"
              min="1"
              required
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleEstimate}
              disabled={isEstimating || isLoading || !exerciseType.trim() || !durationMinutes}
              className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Calculate calories burned"
            >
              {isEstimating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Calculate</span>
            </button>
          </div>
          {estimateError && (
            <p className="mt-1 text-xs text-destructive">{estimateError}</p>
          )}
          {metValue && caloriesBurned && (
            <p className="mt-1 text-xs text-muted-foreground">
              MET value: {metValue.toFixed(1)}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !exerciseType || !durationMinutes || !caloriesBurned}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Update" : "Add Entry"}
          </button>
        </div>
      </form>
    </Modal>
  )
}
