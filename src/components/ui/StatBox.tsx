"use client"

import { cn } from "@/lib/utils"

interface StatBoxProps {
  value: number | string
  label: string
  variant?: "default" | "success" | "warning" | "info"
  className?: string
  formatNumber?: boolean
}

// Format number to max 1 decimal place
function formatValue(value: number | string, format: boolean): string {
  if (typeof value === "string" || !format) return value.toString()
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1)
}

export default function StatBox({
  value,
  label,
  variant = "default",
  className,
  formatNumber = true,
}: StatBoxProps) {
  const valueColorClass = {
    default: "text-foreground",
    success: "text-green-400",
    warning: "text-red-400",
    info: "text-blue-400",
  }[variant]

  return (
    <div
      className={cn("bg-primary/5 border border-border", "rounded-lg p-3 text-center", className)}
    >
      <div
        className={cn("text-2xl font-bold flex justify-center items-center gap-2", valueColorClass)}
      >
        {formatValue(value, formatNumber)}
        <span className="text-xs text-muted-foreground">kcal</span>
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
