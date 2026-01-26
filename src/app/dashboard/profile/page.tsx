"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Save, User, Activity, Scale, Ruler } from "lucide-react"
import { useProfileData, useUpdateProfile } from "@/lib/hooks/useProfileData"
import { useToast } from "@/hooks/use-toast"

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

const profileSchema = z.object({
  fullName: z.string().optional(),
  nickname: z.string().optional(),
  age: z.coerce.number().min(1, "Age is required").max(120, "Age must be less than 120"),
  gender: z.string().min(1, "Gender is required"),
  weightKg: z.coerce.number().min(20, "Weight must be at least 20kg").max(300, "Weight must be less than 300kg"),
  heightCm: z.coerce.number().min(100, "Height must be at least 100cm").max(250, "Height must be less than 250cm"),
  activityLevel: z.string().min(1, "Activity level is required"),
  deficitTarget: z.coerce.number().min(0, "Deficit must be at least 0").max(1500, "Deficit must be less than 1500"),
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function ProfilePage() {
  const { data: profile, isLoading, error: fetchError } = useProfileData()
  const updateProfile = useUpdateProfile()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      nickname: "",
      age: undefined,
      gender: "",
      weightKg: undefined,
      heightCm: undefined,
      activityLevel: "",
      deficitTarget: undefined,
    },
  })

  const activityLevel = watch("activityLevel")

  // Sync form state with fetched profile
  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.fullName || "",
        nickname: profile.nickname || "",
        age: profile.age || undefined,
        gender: profile.gender || "",
        weightKg: profile.weightKg || undefined,
        heightCm: profile.heightCm || undefined,
        activityLevel: profile.activityLevel || "",
        deficitTarget: profile.deficitTarget || undefined,
      })
    }
  }, [profile, reset])

  const onSubmit = (data: ProfileFormData) => {
    updateProfile.mutate(
      {
        fullName: data.fullName || null,
        nickname: data.nickname || null,
        age: data.age,
        gender: data.gender,
        weightKg: data.weightKg,
        heightCm: data.heightCm,
        activityLevel: data.activityLevel,
        deficitTarget: data.deficitTarget,
      },
      {
        onSuccess: () => {
          toast({
            title: "Profile updated",
            description: "Your profile has been saved successfully.",
          })
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: error.message || "Failed to update profile.",
            variant: "destructive",
          })
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const error = fetchError?.message || updateProfile.error?.message

  return (
    <div className="space-y-6 max-w-2xl py-4 mx-auto">
      <div className="flex justify-center">
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground">
            Update your personal information and fitness metrics
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                {...register("fullName")}
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
                {...register("nickname")}
                className="appearance-none relative block w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                placeholder="Nickname"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Age <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                {...register("age")}
                min="1"
                max="120"
                className={`appearance-none relative block w-full px-4 py-3 border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${
                  errors.age ? "border-destructive" : "border-border"
                }`}
                placeholder="25"
              />
              {errors.age && (
                <p className="text-xs text-destructive mt-1">{errors.age.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Gender <span className="text-destructive">*</span>
              </label>
              <select
                {...register("gender")}
                className={`appearance-none relative block w-full px-4 py-3 border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${
                  errors.gender ? "border-destructive" : "border-border"
                }`}
              >
                <option value="">Select gender</option>
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
              {errors.gender && (
                <p className="text-xs text-destructive mt-1">{errors.gender.message}</p>
              )}
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
                Weight (kg) <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                {...register("weightKg")}
                min="20"
                max="300"
                step="0.1"
                className={`appearance-none relative block w-full px-4 py-3 border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${
                  errors.weightKg ? "border-destructive" : "border-border"
                }`}
                placeholder="70"
              />
              {errors.weightKg && (
                <p className="text-xs text-destructive mt-1">{errors.weightKg.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Height (cm) <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                {...register("heightCm")}
                min="100"
                max="250"
                step="0.1"
                className={`appearance-none relative block w-full px-4 py-3 border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${
                  errors.heightCm ? "border-destructive" : "border-border"
                }`}
                placeholder="175"
              />
              {errors.heightCm && (
                <p className="text-xs text-destructive mt-1">{errors.heightCm.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Activity Level Section */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Activity Level <span className="text-destructive">*</span>
            </h2>
          </div>

          <div className="space-y-2">
            {ACTIVITY_LEVELS.map((level) => (
              <label
                key={level.value}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  activityLevel === level.value
                    ? "border-primary bg-primary/5"
                    : errors.activityLevel
                    ? "border-destructive hover:bg-secondary/50"
                    : "border-border hover:bg-secondary/50"
                }`}
              >
                <input
                  type="radio"
                  {...register("activityLevel")}
                  value={level.value}
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
          {errors.activityLevel && (
            <p className="text-xs text-destructive">{errors.activityLevel.message}</p>
          )}
        </div>

        {/* Goal Settings */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Ruler className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Goal Settings</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Daily Calorie Deficit Target <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              {...register("deficitTarget")}
              min="0"
              max="1500"
              step="50"
              className={`appearance-none relative block w-full px-4 py-3 border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${
                errors.deficitTarget ? "border-destructive" : "border-border"
              }`}
              placeholder="500"
            />
            {errors.deficitTarget && (
              <p className="text-xs text-destructive mt-1">{errors.deficitTarget.message}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Recommended: 300-500 cal/day for sustainable weight loss
            </p>
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

            <div className="grid gap-4 sm:grid-cols-2">
              {profile?.bmr && (
                <div className="p-4 bg-secondary/30 rounded-lg flex flex-col items-center">
                  <p className="text-sm text-muted-foreground">BMR</p>
                  <p className="text-xl font-bold text-foreground">
                    {Math.round(Number(profile.bmr))} cal
                  </p>
                  <p className="text-xs text-muted-foreground">Basal Metabolic Rate</p>
                </div>
              )}
              {profile?.tdee && (
                <div className="p-4 bg-secondary/30 rounded-lg flex flex-col items-center">
                  <p className="text-sm text-muted-foreground">TDEE</p>
                  <p className="text-xl font-bold text-foreground">
                    {Math.round(Number(profile.tdee))} cal
                  </p>
                  <p className="text-xs text-muted-foreground">Total Daily Energy Expenditure</p>
                </div>
              )}
            </div>

            {profile?.dailyCalorieGoal && (
              <div className="flex flex-row justify-center bg-primary/10 rounded-lg border border-primary/20 mb-6">
                <div className="p-4 flex flex-col items-center">
                  <p className="text-sm text-muted-foreground">Daily Calorie Goal</p>
                  <p className="text-2xl font-bold text-primary">
                    {Math.round(Number(profile.dailyCalorieGoal))} cal
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    TDEE ({Math.round(Number(profile.tdee || 0))}) - Deficit ({Math.round(Number(profile.deficitTarget || 0))})
                  </p>
                </div>
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

        {/* Submit Button */}
        <div className="fixed bottom-0 left-0 right-0 lg:ml-[256px] flex justify-center bg-background pt-4 pb-6  px-4">
          <button
            type="submit"
            disabled={updateProfile.isPending || !isDirty}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors max-w-2xl"
          >
            {updateProfile.isPending ? (
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
        </div>
      </form>
    </div>
  )
}
