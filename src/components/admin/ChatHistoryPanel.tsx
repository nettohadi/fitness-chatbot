"use client"

import { useEffect, useRef } from "react"
import { useUserMessages } from "@/lib/hooks/useAdminData"
import { Loader2, Bot, User, RefreshCw } from "lucide-react"

interface ChatHistoryPanelProps {
  userId: string
}

export default function ChatHistoryPanel({ userId }: ChatHistoryPanelProps) {
  const { data, isLoading, error, refetch, isFetching } = useUserMessages(userId)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages load
  useEffect(() => {
    if (data?.messages && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "instant" })
    }
  }, [data?.messages])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading messages...</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load messages</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : "Data not found"}
        </p>
      </div>
    )
  }

  const { user, messages } = data

  // Reverse messages so oldest are at top, newest at bottom (like WhatsApp/Telegram)
  const sortedMessages = [...messages].reverse()

  return (
    <div className="flex flex-col h-[60vh]">
      {/* Header */}
      <div className="pb-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-foreground">
              Chat History: {user.fullName || user.nickname || user.phoneNumber}
            </h3>
            <p className="text-sm text-muted-foreground">
              {messages.length} messages • Read-only view
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {sortedMessages.length > 0 ? (
          <>
            {sortedMessages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  {message.role === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                {/* Message bubble */}
                <div
                  className={`max-w-[80%] ${
                    message.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary text-foreground rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                  <p
                    className={`text-xs text-muted-foreground mt-1 ${
                      message.role === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No messages found</p>
            <p className="text-sm text-muted-foreground mt-1">
              This user hasn&apos;t chatted with the bot yet
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
