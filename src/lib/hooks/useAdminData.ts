"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

// Types
export interface DashboardStats {
  totalUsers: number
  activeUsers: number
  apiCallsToday: number
  costToday: number
  calorieEntriesToday: number
  exerciseEntriesToday: number
}

export interface User {
  id: string
  phoneNumber: string
  fullName: string | null
  nickname: string | null
  profileCompleted: boolean
  createdAt: string
  age: number | null
  gender: string | null
  weightKg: number | null
  heightCm: number | null
  dailyCalorieGoal: number | null
  timezone: string | null
  _count: {
    calorieEntries: number
    exerciseEntries: number
  }
}

export interface UsersResponse {
  users: User[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface LogEntry {
  id: string
  createdAt: string
  model: string
  inputTokens: number
  outputTokens: number
  totalCost: number
  latencyMs: number
  user: {
    phoneNumber: string
    fullName: string | null
    nickname: string | null
  } | null
}

export interface LogsResponse {
  logs: LogEntry[]
  stats: {
    totalCost: number
    todayCost: number
    totalLogs: number
    todayLogs: number
  }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface Analytics {
  users: {
    total: number
    last30Days: number
    last7Days: number
    completedProfiles: number
    profileCompletionRate: number
  }
  entries: {
    totalCalorie: number
    totalExercise: number
    last7DaysCalorie: number
    last7DaysExercise: number
  }
  api: {
    totalCost: number
    totalInputTokens: number
    totalOutputTokens: number
    avgLatency: number
  }
  topExercises: Array<{
    exerciseType: string
    _count: {
      exerciseType: number
    }
  }>
  activity: {
    activeUsers: number
    activeRate: number
  }
}

// Fetch functions
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`)
  }
  return response.json()
}

// Hooks
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["admin", "stats"],
    queryFn: () => fetchJson<DashboardStats>("/api/admin/stats"),
  })
}

export function useUsers(page: number = 1, limit: number = 50, search?: string) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })
  if (search) {
    params.set("search", search)
  }

  return useQuery<UsersResponse>({
    queryKey: ["admin", "users", page, limit, search],
    queryFn: () => fetchJson<UsersResponse>(`/api/admin/users?${params}`),
  })
}

export interface UserDetail {
  id: string
  phoneNumber: string
  fullName: string | null
  nickname: string | null
  profileCompleted: boolean
  createdAt: string
  updatedAt: string
  age: number | null
  gender: string | null
  weightKg: number | null
  heightCm: number | null
  dailyCalorieGoal: number | null
  deficitTarget: number | null
  timezone: string | null
  bmr: number | null
  tdee: number | null
  activityLevel: string | null
  preferredLanguage: string | null
  calorieEntries: Array<{
    id: string
    calories: number
    foodDescription: string | null
    estimatedByAi: boolean
    entryDate: string
    entryTime: string
    createdAt: string
  }>
  exerciseEntries: Array<{
    id: string
    exerciseType: string
    durationMinutes: number
    caloriesBurned: number | null
    metValue: number | null
    entryDate: string
    entryTime: string
    createdAt: string
  }>
  _count: {
    calorieEntries: number
    exerciseEntries: number
  }
}

export function useUser(id: string) {
  return useQuery<UserDetail>({
    queryKey: ["admin", "users", id],
    queryFn: () => fetchJson<UserDetail>(`/api/admin/users/${id}`),
    enabled: !!id,
  })
}

export interface LogDetail {
  id: string
  createdAt: string
  model: string
  systemPrompt: string
  messages: any
  response: string
  inputTokens: number
  outputTokens: number
  totalCost: number
  latencyMs: number
  user: {
    id: string
    phoneNumber: string
    fullName: string | null
    nickname: string | null
  } | null
}

export function useLogs(page: number = 1, limit: number = 50, userId?: string) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })
  if (userId) {
    params.set("userId", userId)
  }

  return useQuery<LogsResponse>({
    queryKey: ["admin", "logs", page, limit, userId],
    queryFn: () => fetchJson<LogsResponse>(`/api/admin/logs?${params}`),
  })
}

export function useLog(id: string) {
  return useQuery<LogDetail>({
    queryKey: ["admin", "logs", id],
    queryFn: () => fetchJson<LogDetail>(`/api/admin/logs/${id}`),
    enabled: !!id,
  })
}

export function useAnalytics() {
  return useQuery<Analytics>({
    queryKey: ["admin", "analytics"],
    queryFn: () => fetchJson<Analytics>("/api/admin/analytics"),
  })
}

// User Today Status
export interface UserTodayStatus {
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
    calorieEntries: Array<{
      id: string
      calories: number
      foodDescription: string | null
      estimatedByAi: boolean
      entryTime: string
    }>
    exerciseEntries: Array<{
      id: string
      exerciseType: string
      durationMinutes: number
      caloriesBurned: number | null
      entryTime: string
    }>
  }
}

export function useUserTodayStatus(userId: string) {
  return useQuery<UserTodayStatus>({
    queryKey: ["admin", "users", userId, "today"],
    queryFn: () => fetchJson<UserTodayStatus>(`/api/admin/users/${userId}/today`),
    enabled: !!userId,
  })
}

// User Messages
export interface UserMessages {
  user: {
    id: string
    fullName: string | null
    nickname: string | null
    phoneNumber: string
  }
  messages: Array<{
    id: string
    role: "user" | "assistant"
    content: string
    timestamp: string
  }>
}

export function useUserMessages(userId: string) {
  return useQuery<UserMessages>({
    queryKey: ["admin", "users", userId, "messages"],
    queryFn: () => fetchJson<UserMessages>(`/api/admin/users/${userId}/messages`),
    enabled: !!userId,
  })
}

// Food Calories
export interface FoodCalorieEntry {
  id: string
  name: string
  nameNormalized: string
  caloriesPer100g: number
  source: string
  usageCount: number
  createdAt: string
  updatedAt: string
}

export interface FoodCaloriesResponse {
  foods: FoodCalorieEntry[]
  stats: {
    totalCount: number
    aiCount: number
    manualCount: number
    topUsed: { name: string; count: number } | null
  }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function useFoodCalories(
  page: number = 1,
  limit: number = 50,
  search?: string,
  source?: string
) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })
  if (search) {
    params.set("search", search)
  }
  if (source) {
    params.set("source", source)
  }

  return useQuery<FoodCaloriesResponse>({
    queryKey: ["admin", "food-calories", page, limit, search, source],
    queryFn: () => fetchJson<FoodCaloriesResponse>(`/api/admin/food-calories?${params}`),
  })
}

export function useUpdateFoodCalorie() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      caloriesPer100g,
    }: {
      id: string
      caloriesPer100g: number
    }) => {
      const response = await fetch(`/api/admin/food-calories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caloriesPer100g }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "food-calories"] })
    },
  })
}
