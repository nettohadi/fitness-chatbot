"use client"

import { signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Session } from "next-auth"
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  LogOut,
  Menu,
  X,
  Dumbbell,
  Utensils,
} from "lucide-react"
import { useState } from "react"
import ThemeToggle from "@/components/ThemeToggle"

interface SidebarProps {
  session: Session
}

const navItems = [
  {
    name: "Overview",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Users",
    href: "/admin/dashboard/users",
    icon: Users,
  },
  {
    name: "API Logs",
    href: "/admin/dashboard/logs",
    icon: FileText,
  },
  {
    name: "Food Calories",
    href: "/admin/dashboard/food-calories",
    icon: Utensils,
  },
  {
    name: "Analytics",
    href: "/admin/dashboard/analytics",
    icon: BarChart3,
  },
]

export default function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg">
            <Dumbbell className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Fitness Bot</h1>
            <p className="text-xs text-muted-foreground">Admin Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-border space-y-4">
        {/* Theme toggle */}
        <div className="flex items-center justify-between px-4">
          <span className="text-sm text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>

        {/* User info */}
        <div className="px-4 py-2">
          <p className="text-sm font-medium text-foreground truncate">
            {session.user.name || session.user.email}
          </p>
          <p className="text-xs text-muted-foreground">Administrator</p>
        </div>

        {/* Sign out button */}
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-8 left-4 z-50 p-2 bg-card rounded-lg shadow-lg border border-border"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? (
          <X className="h-6 w-6 text-foreground" />
        ) : (
          <Menu className="h-6 w-6 text-foreground" />
        )}
      </button>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-card border-r border-border h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full pt-14">
          <SidebarContent />
        </div>
      </aside>
    </>
  )
}
