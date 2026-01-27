"use client"

import { ReactNode } from "react"

interface CircularProgressProps {
  percentage: number
  size?: number
  strokeWidth?: number
  children?: ReactNode
  showDefaultLabel?: boolean
  progressColor?: string
  exceededColor?: string
}

export default function CircularProgress({
  percentage,
  size = 200,
  strokeWidth = 16,
  children,
  showDefaultLabel = true,
  progressColor = "text-primary",
  exceededColor = "text-red-500",
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100)
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="dark:text-secondary text-neutral-300/60"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={percentage >= 100 ? exceededColor : progressColor}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children ? (
          children
        ) : showDefaultLabel ? (
          <>
            <span className="text-3xl font-bold text-foreground">
              {Math.round(clampedPercentage)}%
            </span>
            <span className="text-sm text-muted-foreground">of goal</span>
          </>
        ) : null}
      </div>
    </div>
  )
}
