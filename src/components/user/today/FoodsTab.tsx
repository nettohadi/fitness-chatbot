"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, Sparkles } from "lucide-react"
import { CalorieEntry, useDeleteCalorieEntry } from "@/lib/hooks/useTodayData"
import { useToast } from "@/hooks/use-toast"
import FoodEntryForm from "./FoodEntryForm"
import ConfirmDialog from "@/components/ui/ConfirmDialog"

interface FoodsTabProps {
  entries: CalorieEntry[]
}

export default function FoodsTab({ entries }: FoodsTabProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<CalorieEntry | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState<CalorieEntry | null>(null)

  const deleteEntry = useDeleteCalorieEntry()
  const { toast } = useToast()

  const handleAdd = () => {
    setEditingEntry(null)
    setIsFormOpen(true)
  }

  const handleEdit = (entry: CalorieEntry) => {
    setEditingEntry(entry)
    setIsFormOpen(true)
  }

  const handleDeleteClick = (entry: CalorieEntry) => {
    setEntryToDelete(entry)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return

    try {
      await deleteEntry.mutateAsync(entryToDelete.id)
      toast({
        title: "Entry deleted",
        description: `"${entryToDelete.foodDescription || "Food entry"}" has been removed.`,
      })
      setDeleteDialogOpen(false)
      setEntryToDelete(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete entry. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingEntry(null)
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-foreground">
          Today&apos;s Food ({entries.length})
        </h3>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {/* Entries List */}
      {entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {entry.foodDescription || "No description"}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatTime(entry.entryTime)}</span>
                  {entry.estimatedByAi && (
                    <span className="flex items-center gap-0.5">
                      <Sparkles className="h-3 w-3" />
                      AI
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                  {entry.calories} kcal
                </span>
                <button
                  onClick={() => handleEdit(entry)}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteClick(entry)}
                  disabled={deleteEntry.isPending}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No food entries today</p>
          <button
            onClick={handleAdd}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Add your first entry
          </button>
        </div>
      )}

      {/* Entry Form Modal */}
      <FoodEntryForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        entry={editingEntry}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Food Entry"
        description={`Are you sure you want to delete "${entryToDelete?.foodDescription || "this entry"}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
        isLoading={deleteEntry.isPending}
      />
    </div>
  )
}
