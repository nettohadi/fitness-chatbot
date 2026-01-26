"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export interface UserProfile {
  id: string
  phoneNumber: string
  fullName: string | null
  nickname: string | null
  age: number | null
  gender: string | null
  weightKg: number | null
  heightCm: number | null
  activityLevel: string | null
  bmr: number | null
  tdee: number | null
  dailyCalorieGoal: number | null
  deficitTarget: number | null
  timezone: string | null
}

export interface ProfileUpdateData {
  fullName?: string | null
  nickname?: string | null
  age?: number | null
  gender?: string | null
  weightKg?: number | null
  heightCm?: number | null
  activityLevel?: string | null
  deficitTarget?: number | null
}

// Fetch profile
async function fetchProfile(): Promise<UserProfile> {
  const response = await fetch("/api/user/profile")
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to fetch profile" }))
    throw new Error(error.error)
  }
  const data = await response.json()
  return data.user
}

// Update profile
async function updateProfile(data: ProfileUpdateData): Promise<UserProfile> {
  const response = await fetch("/api/user/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to update profile" }))
    throw new Error(error.error)
  }
  const result = await response.json()
  return result.user
}

// Hook for fetching profile
export function useProfileData() {
  return useQuery<UserProfile>({
    queryKey: ["user", "profile"],
    queryFn: fetchProfile,
  })
}

// Hook for updating profile
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      // Update profile cache
      queryClient.setQueryData(["user", "profile"], updatedUser)
      // Also invalidate today data since it includes user info
      queryClient.invalidateQueries({ queryKey: ["user", "today"] })
    },
  })
}
