import { Power, PowerOff, Tag, FolderPlus, X } from "lucide-react"
import { useAppStore } from "../../stores/appStore"
import { enablePlugin, disablePlugin } from "../../lib/tauri"
import { useQueryClient } from "@tanstack/react-query"

export function BulkActions() {
  const selectedIds = useAppStore((s) => s.selectedPluginIds)
  const clearSelection = useAppStore((s) => s.clearSelection)
  const addToast = useAppStore((s) => s.addToast)
  const queryClient = useQueryClient()

  if (selectedIds.length === 0) return null

  const handleBulkEnable = async () => {
    try {
      await Promise.all(selectedIds.map((id) => enablePlugin(id)))
      addToast("success", `Enabled ${selectedIds.length} plugins`)
      queryClient.invalidateQueries({ queryKey: ["plugins"] })
      queryClient.invalidateQueries({ queryKey: ["stats"] })
      clearSelection()
    } catch (err) {
      addToast("error", `Failed to enable plugins: ${err}`)
    }
  }

  const handleBulkDisable = async () => {
    try {
      await Promise.all(selectedIds.map((id) => disablePlugin(id)))
      addToast("success", `Disabled ${selectedIds.length} plugins`)
      queryClient.invalidateQueries({ queryKey: ["plugins"] })
      queryClient.invalidateQueries({ queryKey: ["stats"] })
      clearSelection()
    } catch (err) {
      addToast("error", `Failed to disable plugins: ${err}`)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2">
      <span className="text-sm font-medium text-primary">
        {selectedIds.length} selected
      </span>
      <div className="h-4 w-px bg-border" />
      <button
        onClick={handleBulkEnable}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-success hover:bg-success/10"
      >
        <Power size={14} />
        Enable All
      </button>
      <button
        onClick={handleBulkDisable}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-error hover:bg-error/10"
      >
        <PowerOff size={14} />
        Disable All
      </button>
      <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-light">
        <Tag size={14} />
        Tag
      </button>
      <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-light">
        <FolderPlus size={14} />
        Add to Collection
      </button>
      <div className="flex-1" />
      <button
        onClick={clearSelection}
        className="flex h-6 w-6 items-center justify-center rounded text-muted hover:text-text"
      >
        <X size={14} />
      </button>
    </div>
  )
}
