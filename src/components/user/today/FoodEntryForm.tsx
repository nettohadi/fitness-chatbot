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
import { useToast } from "@/hooks/use-toast"

interface FoodEntryFormProps {
  isOpen: boolean
  onClose: () => void
  entry?: CalorieEntry | null
}

export default function FoodEntryForm({ isOpen, onClose, entry }: FoodEntryFormProps) {
  const [foodName, setFoodName] = useState("")
  const [portion, setPortion] = useState("")
  const [calories, setCalories] = useState("")
  const [isEstimatedByAi, setIsEstimatedByAi] = useState(false)
  const [estimateError, setEstimateError] = useState("")

  const addEntry = useAddCalorieEntry()
  const updateEntry = useUpdateCalorieEntry()
  const estimateCalories = useEstimateCalories()
  const { toast } = useToast()

  const isEditing = !!entry

  // Parse food description into name and portion when editing
  const parseDescription = (desc: string) => {
    // Try to extract portion (e.g., "100g", "2 porsi", "1 slice")
    const portionMatch = desc.match(/(\d+\s*(?:g|gr|gram|kg|ml|l|porsi|pcs|slice|slices|piece|pieces|cup|cups|bowl|bowls|plate|plates|sendok|sdm|sdt)?)\s*$/i)
    if (portionMatch) {
      const portionPart = portionMatch[1]
      const namePart = desc.slice(0, desc.lastIndexOf(portionPart)).trim()
      return { name: namePart || desc, portion: portionPart }
    }
    return { name: desc, portion: "" }
  }

  // Reset form when modal opens/closes or entry changes
  useEffect(() => {
    if (isOpen) {
      if (entry) {
        const parsed = parseDescription(entry.foodDescription || "")
        setFoodName(parsed.name)
        setPortion(parsed.portion)
        setCalories(entry.calories.toString())
        setIsEstimatedByAi(entry.estimatedByAi)
      } else {
        setFoodName("")
        setPortion("")
        setCalories("")
        setIsEstimatedByAi(false)
      }
      setEstimateError("")
    }
  }, [isOpen, entry])

  const handleEstimate = async () => {
    if (!foodName.trim()) {
      setEstimateError("Please enter a food name first")
      return
    }

    setEstimateError("")
    try {
      const result = await estimateCalories.mutateAsync({
        foodName: foodName.trim(),
        portion: portion.trim() || undefined,
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

    // Combine food name and portion for description
    const foodDescription = portion.trim()
      ? `${foodName.trim()} ${portion.trim()}`
      : foodName.trim()

    try {
      if (isEditing && entry) {
        await updateEntry.mutateAsync({
          id: entry.id,
          data: {
            foodDescription: foodDescription || undefined,
            calories: calorieValue,
          },
        })
        toast({
          title: "Entry updated",
          description: `"${foodDescription}" has been updated.`,
        })
      } else {
        await addEntry.mutateAsync({
          foodDescription,
          calories: calorieValue,
          estimatedByAi: isEstimatedByAi,
        })
        toast({
          title: "Entry added",
          description: `"${foodDescription}" (${calorieValue} kcal) has been logged.`,
        })
      }
      onClose()
    } catch (error) {
      toast({
        title: "Error",
        description: isEditing ? "Failed to update entry." : "Failed to add entry.",
        variant: "destructive",
      })
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
        {/* Food Name */}
        <div>
          <label
            htmlFor="foodName"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Food Name
          </label>
          <input
            id="foodName"
            type="text"
            value={foodName}
            onChange={(e) => setFoodName(e.target.value)}
            placeholder="e.g., Nasi goreng, Pizza"
            className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        {/* Portion */}
        <div>
          <label
            htmlFor="portion"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Portion
          </label>
          <input
            id="portion"
            type="text"
            value={portion}
            onChange={(e) => setPortion(e.target.value)}
            placeholder="e.g., 150g, 2 slices, 1 porsi"
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
              disabled={isEstimating || isLoading || !foodName.trim()}
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
