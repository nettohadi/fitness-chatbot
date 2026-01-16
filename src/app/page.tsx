import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session && session.user.role === "admin") {
    redirect("/admin/dashboard")
  } else {
    redirect("/admin/login")
  }
}
