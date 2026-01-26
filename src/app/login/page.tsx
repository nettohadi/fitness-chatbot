"use client"

import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, FormEvent, Suspense } from "react"
import { Dumbbell, Loader2, Phone, KeyRound } from "lucide-react"

function UserLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [step, setStep] = useState<"phone" | "otp">("phone")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/user/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to send OTP")
        setLoading(false)
        return
      }

      setMessage("OTP sent! Check your Telegram/WhatsApp.")
      setStep("otp")
      setLoading(false)
    } catch (err) {
      setError("An error occurred. Please try again.")
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("user-otp", {
        phoneNumber,
        otpCode,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid or expired OTP code")
        setLoading(false)
        return
      }

      // Redirect to dashboard
      const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
      router.push(callbackUrl)
      router.refresh()
    } catch (err) {
      setError("An error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-xl">
              <Dumbbell className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-foreground">
            Dashboard Login
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {step === "phone"
              ? "Enter your phone number to receive an OTP"
              : "Enter the OTP sent to your phone"}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
              step === "phone"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            <Phone className="h-4 w-4" />
            Phone
          </div>
          <div className="w-8 h-0.5 bg-border" />
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
              step === "otp"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            <KeyRound className="h-4 w-4" />
            OTP
          </div>
        </div>

        {/* Phone Form */}
        {step === "phone" && (
          <form className="mt-8 space-y-6" onSubmit={handleRequestOtp}>
            <div>
              <label
                htmlFor="phoneNumber"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Phone Number
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                placeholder="+62812345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={loading}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Use the same number registered with the bot
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                <p className="text-sm font-medium text-destructive">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                "Send OTP"
              )}
            </button>
          </form>
        )}

        {/* OTP Form */}
        {step === "otp" && (
          <form className="mt-8 space-y-6" onSubmit={handleVerifyOtp}>
            {message && (
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
                <p className="text-sm font-medium text-primary">{message}</p>
              </div>
            )}

            <div>
              <label
                htmlFor="otpCode"
                className="block text-sm font-medium text-foreground mb-1"
              >
                OTP Code
              </label>
              <input
                id="otpCode"
                name="otpCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors text-center text-2xl tracking-widest"
                placeholder="000000"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                <p className="text-sm font-medium text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Login"
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("phone")
                  setOtpCode("")
                  setError("")
                  setMessage("")
                }}
                disabled={loading}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Use a different number
              </button>
            </div>
          </form>
        )}

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Fitness Chatbot Dashboard
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <UserLoginForm />
    </Suspense>
  )
}
