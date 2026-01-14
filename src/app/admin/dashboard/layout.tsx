import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import AdminNav from "@/components/admin/AdminNav"

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
    <div className="min-h-screen bg-gray-100">
      <AdminNav session={session} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
