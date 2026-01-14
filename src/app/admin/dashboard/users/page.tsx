import { prisma } from "@/lib/prisma"
import Link from "next/link"

async function getUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      phoneNumber: true,
      fullName: true,
      nickname: true,
      profileCompleted: true,
      createdAt: true,
      age: true,
      gender: true,
      weightKg: true,
      heightCm: true,
      dailyCalorieGoal: true,
      _count: {
        select: {
          calorieEntries: true,
          exerciseEntries: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return users
}

export default async function UsersPage() {
  const users = await getUsers()

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all users registered in the fitness chatbot
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                    >
                      User
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Phone
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Profile
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Stats
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Activity
                    </th>
                    <th
                      scope="col"
                      className="relative py-3.5 pl-3 pr-4 sm:pr-6"
                    >
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                        <div className="flex items-center">
                          <div>
                            <div className="font-medium text-gray-900">
                              {user.fullName || user.nickname || "No name"}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {user.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {user.phoneNumber}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        {user.profileCompleted ? (
                          <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
                            Complete
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-yellow-100 px-2 text-xs font-semibold leading-5 text-yellow-800">
                            Incomplete
                          </span>
                        )}
                        {user.profileCompleted && (
                          <div className="text-xs text-gray-500 mt-1">
                            {user.age}y, {user.gender}, {user.weightKg?.toString()}kg
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div>Goal: {user.dailyCalorieGoal?.toString() || "N/A"} kcal</div>
                        <div className="text-xs">
                          {user.heightCm?.toString()}cm
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div>
                          {user._count.calorieEntries} food entries
                        </div>
                        <div className="text-xs">
                          {user._count.exerciseEntries} exercise entries
                        </div>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <Link
                          href={`/admin/dashboard/users/${user.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          View<span className="sr-only">, {user.fullName}</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">No users found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-700">
          Showing <span className="font-medium">{users.length}</span> user(s)
        </p>
      </div>
    </div>
  )
}
