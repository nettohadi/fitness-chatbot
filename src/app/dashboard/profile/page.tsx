"use client"

import { useState, useEffect, FormEvent } from "react"
import { Loader2, Save, User, Activity, Scale, Ruler } from "lucide-react"

interface UserProfile {
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
  timezone: string | null
}

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary", description: "Little or no exercise" },
  { value: "light", label: "Light", description: "Exercise 1-3 days/week" },
  { value: "moderate", label: "Moderate", description: "Exercise 3-5 days/week" },
  { value: "active", label: "Active", description: "Exercise 6-7 days/week" },
  { value: "very_active", label: "Very Active", description: "Hard exercise daily" },
]

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
]

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Form state
  const [fullName, setFullName] = useState("")
  const [nickname, setNickname] = useState("")
  const [age, setAge] = useState("")
  const [gender, setGender] = useState("")
  const [weightKg, setWeightKg] = useState("")
  const [heightCm, setHeightCm] = useState("")
  const [activityLevel, setActivityLevel] = useState("")

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/user/profile")
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to load profile")
        setLoading(false)
        return
      }

      const user = data.user
      setProfile(user)
      setFullName(user.fullName || "")
      setNickname(user.nickname || "")
      setAge(user.age?.toString() || "")
      setGender(user.gender || "")
      setWeightKg(user.weightKg?.toString() || "")
      setHeightCm(user.heightCm?.toString() || "")
      setActivityLevel(user.activityLevel || "")
      setLoading(false)
    } catch (err) {
      setError("Failed to load profile")
      setLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSaving(true)

    try {
      const updates: Record<string, string | number | null> = {}

      if (fullName !== (profile?.fullName || "")) {
        updates.fullName = fullName || null
      }
      if (nickname !== (profile?.nickname || "")) {
        updates.nickname = nickname || null
      }
      if (age !== (profile?.age?.toString() || "")) {
        updates.age = age ? parseInt(age) : null
      }
      if (gender !== (profile?.gender || "")) {
        updates.gender = gender || null
      }
      if (weightKg !== (profile?.weightKg?.toString() || "")) {
        updates.weightKg = weightKg ? parseFloat(weightKg) : null
      }
      if (heightCm !== (profile?.heightCm?.toString() || "")) {
        updates.heightCm = heightCm ? parseFloat(heightCm) : null
      }
      if (activityLevel !== (profile?.activityLevel || "")) {
        updates.activityLevel = activityLevel || null
      }

      if (Object.keys(updates).length === 0) {
        setSuccess("No changes to save")
        setSaving(false)
        return
      }

      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to update profile")
        setSaving(false)
        return
      }

      setProfile(data.user)
      setSuccess("Profile updated successfully!")
      setSaving(false)
    } catch (err) {
      setError("Failed to update profile")
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground">
          Update your personal information and fitness metrics
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Info Section */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Nickname
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                placeholder="Nickname"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Age
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min="1"
                max="120"
                className="appearance-none relative block w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                placeholder="25"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
              >
                <option value="">Select gender</option>
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Body Metrics Section */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Body Metrics</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                min="20"
                max="300"
                step="0.1"
                className="appearance-none relative block w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                placeholder="70"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Height (cm)
              </label>
              <input
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                min="100"
                max="250"
                step="0.1"
                className="appearance-none relative block w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                placeholder="175"
              />
            </div>
          </div>
        </div>

        {/* Activity Level Section */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Activity Level</h2>
          </div>

          <div className="space-y-2">
            {ACTIVITY_LEVELS.map((level) => (
              <label
                key={level.value}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  activityLevel === level.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-secondary/50"
                }`}
              >
                <input
                  type="radio"
                  name="activityLevel"
                  value={level.value}
                  checked={activityLevel === level.value}
                  onChange={(e) => setActivityLevel(e.target.value)}
                  className="sr-only"
                />
                <div>
                  <span className="font-medium text-foreground">{level.label}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    - {level.description}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Calculated Metrics (Read-only) */}
        {(profile?.bmr || profile?.tdee || profile?.dailyCalorieGoal) && (
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Ruler className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Calculated Metrics</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              These are automatically calculated based on your profile
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              {profile?.bmr && (
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">BMR</p>
                  <p className="text-xl font-bold text-foreground">
                    {Math.round(Number(profile.bmr))} cal
                  </p>
                </div>
              )}
              {profile?.tdee && (
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">TDEE</p>
                  <p className="text-xl font-bold text-foreground">
                    {Math.round(Number(profile.tdee))} cal
                  </p>
                </div>
              )}
              {profile?.dailyCalorieGoal && (
                <div className="p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Daily Goal</p>
                  <p className="text-xl font-bold text-primary">
                    {Math.round(Number(profile.dailyCalorieGoal))} cal
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              {success}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </button>
      </form>
    </div>
  )
}
