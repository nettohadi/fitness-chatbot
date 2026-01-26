"use client"

interface StatBoxProps {
  value: number | string
  label: string
  variant?: "default" | "success" | "warning" | "info"
}

export default function StatBox({ value, label, variant = "default" }: StatBoxProps) {
  const valueColorClass = {
    default: "text-foreground",
    success: "text-green-400",
    warning: "text-red-400",
    info: "text-blue-400",
  }[variant]

  return (
    <div className="bg-secondary/30 rounded-lg p-3 text-center">
      <div className={`text-2xl font-bold ${valueColorClass}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
