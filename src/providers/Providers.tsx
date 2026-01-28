"use client"

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import { useState } from "react"
import { signOut } from "next-auth/react"

/**
 * Auth-related error messages that should trigger a redirect to login
 */
const AUTH_ERROR_MESSAGES = ["User not found", "Unauthorized", "Session expired"]

/**
 * Check if an error indicates an auth problem
 */
function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    return AUTH_ERROR_MESSAGES.some((msg) =>
      error.message.toLowerCase().includes(msg.toLowerCase())
    )
  }
  return false
}

/**
 * Global error handler for auth errors - redirects to login
 */
function handleGlobalError(error: unknown) {
  if (isAuthError(error)) {
    signOut({ callbackUrl: "/login" })
  }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: true,
          },
        },
        queryCache: new QueryCache({
          onError: handleGlobalError,
        }),
        mutationCache: new MutationCache({
          onError: handleGlobalError,
        }),
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  )
}
