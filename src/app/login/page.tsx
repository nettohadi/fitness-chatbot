"use client"

import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, FormEvent, Suspense } from "react"
import { Dumbbell, Loader2, KeyRound, MessageCircle } from "lucide-react"

function UserLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [otpCode, setOtpCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Step 1: Look up phone number from OTP code
      const verifyResponse = await fetch("/api/user/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpCode }),
      })

      const verifyData = await verifyResponse.json()

      if (!verifyResponse.ok) {
        setError(verifyData.error || "Invalid or expired OTP code")
        setLoading(false)
        return
      }

      // Step 2: Sign in with phone number and OTP
      const result = await signIn("user-otp", {
        phoneNumber: verifyData.phoneNumber,
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
            Enter the OTP code sent to your Telegram
          </p>
        </div>

        {/* Instruction Box */}
        <div className="rounded-lg bg-secondary/50 border border-border p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-foreground">How to get OTP code:</p>
              <p className="text-muted-foreground mt-1">
                Open Telegram and send <code className="bg-secondary px-1 py-0.5 rounded text-primary">&quot;kirim otp&quot;</code> or <code className="bg-secondary px-1 py-0.5 rounded text-primary">&quot;send me otp&quot;</code> to the Fitness Bot.
              </p>
            </div>
          </div>
        </div>

        {/* OTP Form */}
        <form className="mt-8 space-y-6" onSubmit={handleVerifyOtp}>
          <div>
            <label
              htmlFor="otpCode"
              className="block text-sm font-medium text-foreground mb-1"
            >
              OTP Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeyRound className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                id="otpCode"
                name="otpCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                required
                className="appearance-none relative block w-full pl-10 px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors text-center text-2xl tracking-widest"
                placeholder="000000"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
          )}

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
              "Login"
            )}
          </button>
        </form>

        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Fitness Chatbot Dashboard
          </p>
          <a
            href="/admin/login"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Admin Login
          </a>
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
