import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import Sidebar from "@/components/admin/Sidebar"

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  // Redirect to login if not authenticated or not admin
  if (!session || session.user.role !== "admin") {
    redirect("/admin/login")
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar session={session} />
      <main className="flex-1 overflow-auto">
        <div className="pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
