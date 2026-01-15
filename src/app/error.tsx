"use client"

import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Something went wrong!
        </h2>
        <p className="text-gray-600 mb-4">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
