"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { TodayPage } from "@/components/user/today"

export default function DashboardPage() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return null
  }

  if (!session) {
    redirect("/login")
  }

  return <TodayPage />
}
