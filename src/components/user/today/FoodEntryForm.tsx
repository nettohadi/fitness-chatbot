"use client"

import { useState, useEffect } from "react"
import { Loader2, Sparkles } from "lucide-react"
import Modal from "@/components/ui/Modal"
import {
  CalorieEntry,
  useAddCalorieEntry,
  useUpdateCalorieEntry,
  useEstimateCalories,
} from "@/lib/hooks/useTodayData"

interface FoodEntryFormProps {
  isOpen: boolean
  onClose: () => void
  entry?: CalorieEntry | null
}

export default function FoodEntryForm({ isOpen, onClose, entry }: FoodEntryFormProps) {
  const [foodDescription, setFoodDescription] = useState("")
  const [calories, setCalories] = useState("")
  const [isEstimatedByAi, setIsEstimatedByAi] = useState(false)
  const [estimateError, setEstimateError] = useState("")

  const addEntry = useAddCalorieEntry()
  const updateEntry = useUpdateCalorieEntry()
  const estimateCalories = useEstimateCalories()

  const isEditing = !!entry

  // Reset form when modal opens/closes or entry changes
  useEffect(() => {
    if (isOpen) {
      if (entry) {
        setFoodDescription(entry.foodDescription || "")
        setCalories(entry.calories.toString())
        setIsEstimatedByAi(entry.estimatedByAi)
      } else {
        setFoodDescription("")
        setCalories("")
        setIsEstimatedByAi(false)
      }
      setEstimateError("")
    }
  }, [isOpen, entry])

  const handleEstimate = async () => {
    if (!foodDescription.trim()) {
      setEstimateError("Please enter a food description first")
      return
    }

    setEstimateError("")
    try {
      const result = await estimateCalories.mutateAsync({
        foodName: foodDescription,
      })
      setCalories(result.estimatedCalories.toString())
      setIsEstimatedByAi(result.source === "ai")
    } catch (error) {
      setEstimateError(error instanceof Error ? error.message : "Failed to estimate calories")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const calorieValue = parseInt(calories)
    if (isNaN(calorieValue) || calorieValue <= 0) {
      return
    }

    try {
      if (isEditing && entry) {
        await updateEntry.mutateAsync({
          id: entry.id,
          data: {
            foodDescription: foodDescription.trim() || undefined,
            calories: calorieValue,
          },
        })
      } else {
        await addEntry.mutateAsync({
          foodDescription: foodDescription.trim(),
          calories: calorieValue,
          estimatedByAi: isEstimatedByAi,
        })
      }
      onClose()
    } catch (error) {
      console.error("Failed to save entry:", error)
    }
  }

  const isLoading = addEntry.isPending || updateEntry.isPending
  const isEstimating = estimateCalories.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Food Entry" : "Add Food Entry"}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Food Description */}
        <div>
          <label
            htmlFor="foodDescription"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Food Description
          </label>
          <input
            id="foodDescription"
            type="text"
            value={foodDescription}
            onChange={(e) => setFoodDescription(e.target.value)}
            placeholder="e.g., Nasi goreng 150g"
            className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        {/* Calories with Estimate Button */}
        <div>
          <label
            htmlFor="calories"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Calories
          </label>
          <div className="flex gap-2">
            <input
              id="calories"
              type="number"
              value={calories}
              onChange={(e) => {
                setCalories(e.target.value)
                setIsEstimatedByAi(false)
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
              disabled={isEstimating || isLoading || !foodDescription.trim()}
              className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Estimate calories with AI"
            >
              {isEstimating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Estimate</span>
            </button>
          </div>
          {estimateError && (
            <p className="mt-1 text-xs text-destructive">{estimateError}</p>
          )}
          {isEstimatedByAi && calories && (
            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              AI estimated
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
            disabled={isLoading || !calories}
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
