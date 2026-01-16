"use client"

import { Loader2 } from "lucide-react"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  text?: string
  className?: string
}

export default function LoadingSpinner({
  size = "md",
  text,
  className = "",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      {text && (
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  )
}

export function PageLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" text={text} />
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-card rounded-lg shadow p-5 animate-pulse">
      <div className="h-4 bg-muted rounded w-1/3 mb-3"></div>
      <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-muted rounded w-2/3"></div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-card rounded-lg shadow overflow-hidden animate-pulse">
      <div className="bg-muted/50 h-12 border-b border-border"></div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 border-b border-border last:border-0">
          <div className="flex items-center gap-4 p-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-4 bg-muted rounded w-1/6"></div>
            <div className="h-4 bg-muted rounded w-1/5"></div>
            <div className="h-4 bg-muted rounded w-1/6"></div>
          </div>
        </div>
      ))}
    </div>
  )
}
