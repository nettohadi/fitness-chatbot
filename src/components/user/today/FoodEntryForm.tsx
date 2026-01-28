"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Sparkles } from "lucide-react"
import Modal from "@/components/ui/Modal"
import {
  CalorieEntry,
  useAddCalorieEntry,
  useUpdateCalorieEntry,
  useEstimateCalories,
} from "@/lib/hooks/useTodayData"
import { useToast } from "@/hooks/use-toast"

const PORTION_UNITS = [
  { value: "g", label: "grams (g)" },
  { value: "kg", label: "kilograms (kg)" },
  { value: "ml", label: "milliliters (ml)" },
  { value: "l", label: "liters (l)" },
  { value: "oz", label: "ounces (oz)" },
  { value: "lb", label: "pounds (lb)" },
  { value: "cup", label: "cup" },
  { value: "tbsp", label: "tablespoon (tbsp)" },
  { value: "tsp", label: "teaspoon (tsp)" },
  { value: "piece", label: "piece" },
  { value: "slice", label: "slice" },
  { value: "serving", label: "serving" },
  { value: "bowl", label: "bowl" },
  { value: "plate", label: "plate" },
] as const

type PortionUnit = (typeof PORTION_UNITS)[number]["value"]

// List of recognized unit values for parsing
const RECOGNIZED_UNITS = PORTION_UNITS.map((u) => u.value)
const RECOGNIZED_UNITS_PLURAL: Record<string, PortionUnit> = {
  cups: "cup",
  pieces: "piece",
  slices: "slice",
  servings: "serving",
  bowls: "bowl",
  plates: "plate",
  grams: "g",
  kilograms: "kg",
  milliliters: "ml",
  liters: "l",
  ounces: "oz",
  pounds: "lb",
  tablespoons: "tbsp",
  teaspoons: "tsp",
}

const foodEntrySchema = z.object({
  foodName: z.string().min(1, "Food name is required"),
  portionValue: z
    .string()
    .refine((val) => val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
      message: "Portion must be a positive number",
    }),
  portionUnit: z.string(),
  calories: z
    .string()
    .min(1, "Calories is required")
    .refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, {
      message: "Calories must be a positive number",
    }),
})

// Separate schema for structured mode validation (unit required if value provided)
const structuredPortionSchema = foodEntrySchema.refine(
  (data) => {
    if (data.portionValue && data.portionValue.trim() !== "") {
      return data.portionUnit !== ""
    }
    return true
  },
  {
    message: "Please select a unit for the portion",
    path: ["portionUnit"],
  }
)

type FoodEntryFormData = z.infer<typeof foodEntrySchema>
type PortionMode = "structured" | "text"

interface FoodEntryFormProps {
  isOpen: boolean
  onClose: () => void
  entry?: CalorieEntry | null
}

export default function FoodEntryForm({ isOpen, onClose, entry }: FoodEntryFormProps) {
  const [isEstimatedByAi, setIsEstimatedByAi] = useState(false)
  const [estimateError, setEstimateError] = useState("")
  const [portionMode, setPortionMode] = useState<PortionMode>("structured")
  const [portionText, setPortionText] = useState("")

  const addEntry = useAddCalorieEntry()
  const updateEntry = useUpdateCalorieEntry()
  const estimateCalories = useEstimateCalories()
  const { toast } = useToast()

  const isEditing = !!entry

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FoodEntryFormData>({
    resolver: zodResolver(portionMode === "structured" ? structuredPortionSchema : foodEntrySchema),
    defaultValues: {
      foodName: "",
      portionValue: "",
      portionUnit: "",
      calories: "",
    },
  })

  const foodName = watch("foodName")
  const portionValue = watch("portionValue")
  const portionUnit = watch("portionUnit")
  const calories = watch("calories")

  // Parse food description into name and portion when editing
  // Returns recognized flag to determine if we should use structured or text mode
  const parseDescription = (desc: string): {
    name: string
    value: string
    unit: string
    rawPortion: string
    recognized: boolean
  } => {
    // Try to extract portion with number and any unit text at the end
    // Match: "food name 123.45 unittext" or "food name 123,45unittext"
    const portionMatch = desc.match(/(\d+(?:[.,]\d+)?)\s*(\S+)\s*$/i)
    if (portionMatch) {
      const value = portionMatch[1].replace(",", ".") // Normalize comma to dot
      const unitText = portionMatch[2].toLowerCase()

      // Check if unit is recognized (singular or plural)
      let normalizedUnit: string | undefined
      if (RECOGNIZED_UNITS.includes(unitText as PortionUnit)) {
        normalizedUnit = unitText
      } else if (RECOGNIZED_UNITS_PLURAL[unitText]) {
        normalizedUnit = RECOGNIZED_UNITS_PLURAL[unitText]
      }

      const namePart = desc.slice(0, desc.lastIndexOf(portionMatch[0])).trim()

      if (normalizedUnit) {
        // Recognized unit - use structured mode
        return {
          name: namePart || desc,
          value,
          unit: normalizedUnit,
          rawPortion: "",
          recognized: true
        }
      } else {
        // Unrecognized unit (e.g., "buah", "porsi") - use text mode
        const rawPortion = `${portionMatch[1]} ${portionMatch[2]}`
        return {
          name: namePart || desc,
          value: "",
          unit: "",
          rawPortion,
          recognized: false
        }
      }
    }
    // No portion found
    return { name: desc, value: "", unit: "", rawPortion: "", recognized: true }
  }

  // Reset form when modal opens/closes or entry changes
  useEffect(() => {
    if (isOpen) {
      if (entry) {
        const parsed = parseDescription(entry.foodDescription || "")
        if (parsed.recognized) {
          // Recognized unit - use structured mode
          setPortionMode("structured")
          setPortionText("")
          reset({
            foodName: parsed.name,
            portionValue: parsed.value,
            portionUnit: parsed.unit,
            calories: entry.calories.toString(),
          })
        } else {
          // Unrecognized unit - use text mode
          setPortionMode("text")
          setPortionText(parsed.rawPortion)
          reset({
            foodName: parsed.name,
            portionValue: "",
            portionUnit: "",
            calories: entry.calories.toString(),
          })
        }
        setIsEstimatedByAi(entry.estimatedByAi)
      } else {
        // New entry - always structured mode
        setPortionMode("structured")
        setPortionText("")
        reset({
          foodName: "",
          portionValue: "",
          portionUnit: "",
          calories: "",
        })
        setIsEstimatedByAi(false)
      }
      setEstimateError("")
    }
  }, [isOpen, entry, reset])

  const handleEstimate = async () => {
    if (!foodName.trim()) {
      setEstimateError("Please enter a food name first")
      return
    }

    // Check if portion is provided
    const hasPortion =
      (portionMode === "structured" && portionValue && portionUnit) ||
      (portionMode === "text" && portionText.trim())

    if (!hasPortion) {
      setEstimateError("Please enter a portion to estimate calories")
      return
    }

    // Build portion string for API based on mode
    let portion: string | undefined
    if (portionMode === "structured" && portionValue && portionUnit) {
      portion = `${portionValue}${portionUnit}`
    } else if (portionMode === "text" && portionText.trim()) {
      portion = portionText.trim()
    }

    setEstimateError("")
    try {
      const result = await estimateCalories.mutateAsync({
        foodName: foodName.trim(),
        portion,
      })
      setValue("calories", result.estimatedCalories.toString())
      setIsEstimatedByAi(result.source === "ai" || result.source === "cached")
    } catch (error) {
      setEstimateError(error instanceof Error ? error.message : "Failed to estimate calories")
    }
  }

  const onSubmit = async (data: FoodEntryFormData) => {
    const calorieValue = parseInt(data.calories)

    // Combine food name and portion for description based on mode
    let portionStr = ""
    if (portionMode === "structured" && data.portionValue && data.portionUnit) {
      portionStr = `${data.portionValue}${data.portionUnit}`
    } else if (portionMode === "text" && portionText.trim()) {
      portionStr = portionText.trim()
    }
    const foodDescription = portionStr
      ? `${data.foodName.trim()} ${portionStr}`
      : data.foodName.trim()

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
          variant: "success",
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
          variant: "success",
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

  // Check if portion is provided (needed for AI estimate)
  const hasValidPortion =
    (portionMode === "structured" && portionValue && portionUnit) ||
    (portionMode === "text" && portionText.trim())

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Food Entry" : "Add Food Entry"}
      size="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Food Name */}
        <div>
          <label
            htmlFor="foodName"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Food Name <span className="text-destructive">*</span>
          </label>
          <input
            id="foodName"
            type="text"
            {...register("foodName")}
            placeholder="e.g., Nasi goreng, Pizza"
            className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isLoading}
          />
          {errors.foodName && (
            <p className="mt-1 text-xs text-destructive">{errors.foodName.message}</p>
          )}
        </div>

        {/* Portion - Structured (value + unit) or Text mode */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Portion <span className="text-muted-foreground text-xs">(optional)</span>
          </label>
          {portionMode === "structured" ? (
            <>
              <div className="flex gap-2">
                <input
                  id="portionValue"
                  type="number"
                  step="any"
                  {...register("portionValue")}
                  placeholder="e.g., 150"
                  className="w-24 px-3 py-2 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isLoading}
                />
                <select
                  id="portionUnit"
                  {...register("portionUnit")}
                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isLoading}
                >
                  <option value="">Select unit</option>
                  {PORTION_UNITS.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>
              {errors.portionValue && (
                <p className="mt-1 text-xs text-destructive">{errors.portionValue.message}</p>
              )}
              {errors.portionUnit && (
                <p className="mt-1 text-xs text-destructive">{errors.portionUnit.message}</p>
              )}
            </>
          ) : (
            <input
              id="portionText"
              type="text"
              value={portionText}
              onChange={(e) => setPortionText(e.target.value)}
              placeholder="e.g., 1 buah, 2 porsi"
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isLoading}
            />
          )}
        </div>

        {/* Calories with Estimate Button */}
        <div>
          <label
            htmlFor="calories"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Calories <span className="text-destructive">*</span>
          </label>
          <div className="flex gap-2">
            <input
              id="calories"
              type="number"
              {...register("calories", {
                onChange: () => setIsEstimatedByAi(false),
              })}
              placeholder="Enter calories"
              min="1"
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleEstimate}
              disabled={isEstimating || isLoading || !foodName.trim() || !hasValidPortion}
              className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={hasValidPortion ? "Estimate calories with AI" : "Enter portion to estimate"}
            >
              {isEstimating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Estimate</span>
            </button>
          </div>
          {errors.calories && (
            <p className="mt-1 text-xs text-destructive">{errors.calories.message}</p>
          )}
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
            disabled={isLoading}
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
