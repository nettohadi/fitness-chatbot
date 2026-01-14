import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"

async function getLogDetail(id: string) {
  const log = await prisma.claudeApiLog.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          phoneNumber: true,
          fullName: true,
          nickname: true,
        },
      },
    },
  })

  return log
}

export default async function LogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const log = await getLogDetail(id)

  if (!log) {
    notFound()
  }

  const messages = log.messages as any[]

  // Build complete prompt as sent to Claude
  const completePrompt = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SYSTEM PROMPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${log.systemPrompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONVERSATION HISTORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${messages.map((msg: any, idx: number) =>
  `[${msg.role.toUpperCase()}]:\n${msg.content}`
).join('\n\n---\n\n')}`

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <Link
          href="/admin/dashboard/logs"
          className="text-indigo-600 hover:text-indigo-900 text-sm"
        >
          ← Back to logs
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        API Log Details
      </h1>

      {/* Metadata */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Request Information
          </h3>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Time</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {new Date(log.createdAt).toLocaleString()}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">User</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {log.user ? (
                  <div>
                    <div>{log.user.fullName || log.user.nickname || "No name"}</div>
                    <div className="text-gray-500">{log.user.phoneNumber}</div>
                  </div>
                ) : (
                  "System"
                )}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Model</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {log.model}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Tokens</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {log.inputTokens + log.outputTokens} total ({log.inputTokens} in / {log.outputTokens} out)
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Cost</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                ${log.totalCost.toNumber().toFixed(6)}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Latency</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {log.latencyMs}ms
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Complete Prompt Sent to Claude */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 bg-indigo-50 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Complete Prompt Sent to Claude
          </h3>
          <span className="text-xs text-gray-500">
            Includes system prompt + conversation history + user message
          </span>
        </div>
        <div className="px-4 py-5 sm:px-6">
          <pre className="whitespace-pre-wrap text-xs text-gray-700 bg-gray-50 p-4 rounded overflow-x-auto max-h-[600px] overflow-y-auto font-mono border border-gray-200">
            {completePrompt}
          </pre>
        </div>
      </div>

      {/* Response */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-green-50">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Claude Response
          </h3>
        </div>
        <div className="px-4 py-5 sm:px-6">
          <pre className="whitespace-pre-wrap text-sm text-gray-900 bg-gray-50 p-4 rounded font-mono border border-gray-200">
            {log.response}
          </pre>
        </div>
      </div>
    </div>
  )
}
