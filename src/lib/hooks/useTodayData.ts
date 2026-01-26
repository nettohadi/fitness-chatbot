"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

// Types
export interface TodayData {
  user: {
    id: string
    fullName: string | null
    nickname: string | null
    bmr: number | null
    tdee: number | null
    dailyCalorieGoal: number | null
    deficitTarget: number | null
    weightKg: number | null
  }
  today: {
    date: string
    totalCaloriesConsumed: number
    totalCaloriesBurned: number
    netCalories: number
    calorieEntries: CalorieEntry[]
    exerciseEntries: ExerciseEntry[]
  }
}

export interface CalorieEntry {
  id: string
  calories: number
  foodDescription: string | null
  estimatedByAi: boolean
  entryTime: string
}

export interface ExerciseEntry {
  id: string
  exerciseType: string
  durationMinutes: number
  caloriesBurned: number
  metValue: number | null
  entryTime: string
}

export interface CalorieEstimate {
  estimatedCalories: number
  caloriesPer100g: number
  source: "cached" | "ai"
  confidence: "high" | "medium" | "low"
  matchedFood?: string
}

export interface ExerciseEstimate {
  caloriesBurned: number
  metValue: number
  matchedExercise: string | null
}

// Fetch function
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(error.error || "Failed to fetch")
  }
  return response.json()
}

// Main hook for today's data
export function useTodayData() {
  return useQuery<TodayData>({
    queryKey: ["user", "today"],
    queryFn: () => fetchJson<TodayData>("/api/user/today"),
    refetchOnWindowFocus: true,
  })
}

// Hook for adding calorie entry
export function useAddCalorieEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      foodDescription: string
      calories: number
      estimatedByAi?: boolean
    }) => {
      const response = await fetch("/api/user/calories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to add entry" }))
        throw new Error(error.error)
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "today"] })
    },
  })
}

// Hook for updating calorie entry
export function useUpdateCalorieEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: { foodDescription?: string; calories?: number }
    }) => {
      const response = await fetch(`/api/user/calories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to update entry" }))
        throw new Error(error.error)
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "today"] })
    },
  })
}

// Hook for deleting calorie entry
export function useDeleteCalorieEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/user/calories/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to delete entry" }))
        throw new Error(error.error)
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "today"] })
    },
  })
}

// Hook for adding exercise entry
export function useAddExerciseEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      exerciseType: string
      durationMinutes: number
      caloriesBurned: number
      metValue?: number
    }) => {
      const response = await fetch("/api/user/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to add entry" }))
        throw new Error(error.error)
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "today"] })
    },
  })
}

// Hook for updating exercise entry
export function useUpdateExerciseEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: { exerciseType?: string; durationMinutes?: number; caloriesBurned?: number }
    }) => {
      const response = await fetch(`/api/user/exercises/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to update entry" }))
        throw new Error(error.error)
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "today"] })
    },
  })
}

// Hook for deleting exercise entry
export function useDeleteExerciseEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/user/exercises/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to delete entry" }))
        throw new Error(error.error)
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "today"] })
    },
  })
}

// Hook for estimating calories
export function useEstimateCalories() {
  return useMutation({
    mutationFn: async (data: { foodName: string; portion?: string }) => {
      const response = await fetch("/api/user/calories/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to estimate" }))
        throw new Error(error.error)
      }
      return response.json() as Promise<CalorieEstimate>
    },
  })
}

// Hook for estimating exercise calories
export function useEstimateExercise() {
  return useMutation({
    mutationFn: async (data: { exerciseType: string; durationMinutes: number }) => {
      const response = await fetch("/api/user/exercises/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to estimate" }))
        throw new Error(error.error)
      }
      return response.json() as Promise<ExerciseEstimate>
    },
  })
}
