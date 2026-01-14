"use client"

import { signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Session } from "next-auth"

interface AdminNavProps {
  session: Session
}

export default function AdminNav({ session }: AdminNavProps) {
  const pathname = usePathname()

  const navItems = [
    { name: "Overview", href: "/admin/dashboard" },
    { name: "Users", href: "/admin/dashboard/users" },
    { name: "API Logs", href: "/admin/dashboard/logs" },
    { name: "Analytics", href: "/admin/dashboard/analytics" },
  ]

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Fitness Chatbot Admin
              </h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${
                    isActive(item.href)
                      ? "border-indigo-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-sm text-gray-700 mr-4">
                {session.user.name}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/admin/login" })}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
