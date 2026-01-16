"use client"

import { useState } from "react"
import { useUsers } from "@/lib/hooks/useAdminData"
import { TableSkeleton } from "@/components/ui/LoadingSpinner"
import Link from "next/link"
import Modal from "@/components/ui/Modal"
import TodayStatusPanel from "@/components/admin/TodayStatusPanel"
import ChatHistoryPanel from "@/components/admin/ChatHistoryPanel"
import { PieChart, MessageSquare } from "lucide-react"

export default function UsersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [selectedUserForStatus, setSelectedUserForStatus] = useState<string | null>(null)
  const [selectedUserForMessages, setSelectedUserForMessages] = useState<string | null>(null)
  const { data, isLoading, error } = useUsers(page, 50, search || undefined)

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load users</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pt-8">
      <div className="sm:flex sm:items-center sm:justify-between ">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Users</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A list of all users registered in the fitness chatbot
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={10} />
      ) : data ? (
        <>
          <div className="overflow-x-auto shadow ring-1 ring-border rounded-lg">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">
                    User
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                    Phone
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                    Profile
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                    Stats
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                    Activity
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {data.users.map((user) => (
                  <tr key={user.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                      <div>
                        <div className="font-medium text-foreground">
                          {user.fullName || user.nickname || "No name"}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {user.id.slice(0, 8)}...
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                      {user.phoneNumber}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      {user.profileCompleted ? (
                        <span className="inline-flex rounded-full bg-green-500/20 px-2 text-xs font-semibold leading-5 text-green-400">
                          Complete
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-yellow-500/20 px-2 text-xs font-semibold leading-5 text-yellow-400">
                          Incomplete
                        </span>
                      )}
                      {user.profileCompleted && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {user.age}y, {user.gender}, {user.weightKg}kg
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                      <div>Goal: {user.dailyCalorieGoal || "N/A"} kcal</div>
                      <div className="text-xs">{user.heightCm}cm</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                      <div>{user._count.calorieEntries} food entries</div>
                      <div className="text-xs">
                        {user._count.exerciseEntries} exercise entries
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedUserForStatus(user.id)
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          title="Today's Status"
                        >
                          <PieChart className="h-3 w-3" />
                          Today
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedUserForMessages(user.id)
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                          title="Chat History"
                        >
                          <MessageSquare className="h-3 w-3" />
                          Messages
                        </button>
                        <Link
                          href={`/admin/dashboard/users/${user.id}`}
                          className="text-primary hover:text-primary/80 text-xs"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.users.length === 0 && (
              <div className="text-center py-12 bg-card">
                <p className="text-sm text-muted-foreground">No users found</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground text-center sm:text-left">
              Showing{" "}
              <span className="font-medium text-foreground">
                {(page - 1) * 50 + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {Math.min(page * 50, data.pagination.total)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {data.pagination.total}
              </span>{" "}
              users
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.pagination.totalPages}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : null}

      {/* Today Status Modal */}
      <Modal
        isOpen={!!selectedUserForStatus}
        onClose={() => setSelectedUserForStatus(null)}
        title="Today's Status"
        size="md"
      >
        {selectedUserForStatus && <TodayStatusPanel userId={selectedUserForStatus} />}
      </Modal>

      {/* Messages Modal */}
      <Modal
        isOpen={!!selectedUserForMessages}
        onClose={() => setSelectedUserForMessages(null)}
        title="Chat History"
        size="lg"
      >
        {selectedUserForMessages && <ChatHistoryPanel userId={selectedUserForMessages} />}
      </Modal>
    </div>
  )
}
