import { useState } from "react"
import { Plus, X } from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getTags, createTag, tagPlugin, untagPlugin } from "../../lib/tauri"
import { useAppStore } from "../../stores/appStore"
import type { Tag } from "../../lib/types"

const TAG_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
]

interface TagEditorProps {
  pluginId: string
  currentTags: Tag[]
}

export function TagEditor({ pluginId, currentTags }: TagEditorProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState(TAG_COLORS[0])
  const queryClient = useQueryClient()
  const addToast = useAppStore((s) => s.addToast)

  const { data: allTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: getTags,
  })

  const currentTagIds = new Set(currentTags.map((t) => t.id))
  const availableTags = allTags.filter((t) => !currentTagIds.has(t.id))

  const handleRemoveTag = async (tagId: string) => {
    try {
      await untagPlugin(pluginId, tagId)
      queryClient.invalidateQueries({ queryKey: ["plugins"] })
      queryClient.invalidateQueries({ queryKey: ["plugin", pluginId] })
    } catch (err) {
      addToast("error", `Failed to remove tag: ${err}`)
    }
  }

  const handleAddExisting = async (tagId: string) => {
    try {
      await tagPlugin(pluginId, tagId)
      queryClient.invalidateQueries({ queryKey: ["plugins"] })
      queryClient.invalidateQueries({ queryKey: ["plugin", pluginId] })
      setShowAdd(false)
    } catch (err) {
      addToast("error", `Failed to add tag: ${err}`)
    }
  }

  const handleCreateAndAdd = async () => {
    if (!newName.trim()) return
    try {
      const tag = await createTag(newName.trim(), newColor)
      await tagPlugin(pluginId, tag.id)
      queryClient.invalidateQueries({ queryKey: ["tags"] })
      queryClient.invalidateQueries({ queryKey: ["plugins"] })
      queryClient.invalidateQueries({ queryKey: ["plugin", pluginId] })
      setNewName("")
      setShowAdd(false)
    } catch (err) {
      addToast("error", `Failed to create tag: ${err}`)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {currentTags.map((tag) => (
          <span
            key={tag.id}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
            style={{
              backgroundColor: `${tag.color ?? "#64748b"}20`,
              color: tag.color ?? "#64748b",
            }}
          >
            {tag.name}
            <button
              onClick={() => handleRemoveTag(tag.id)}
              className="hover:opacity-70"
            >
              <X size={12} />
            </button>
          </span>
        ))}

        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex h-6 items-center gap-1 rounded-full border border-dashed border-border px-2 text-xs text-muted hover:border-primary hover:text-primary"
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      {showAdd && (
        <div className="mt-3 rounded-lg border border-border bg-surface-light p-3">
          {/* Existing tags */}
          {availableTags.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-xs text-muted">Existing Tags</p>
              <div className="flex flex-wrap gap-1">
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleAddExisting(tag.id)}
                    className="rounded-full px-2.5 py-1 text-xs hover:opacity-80"
                    style={{
                      backgroundColor: `${tag.color ?? "#64748b"}20`,
                      color: tag.color ?? "#64748b",
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Create new */}
          <p className="mb-1.5 text-xs text-muted">Create New</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tag name"
              className="h-8 flex-1 rounded-lg border border-border bg-surface px-3 text-xs text-text placeholder:text-muted focus:border-primary focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleCreateAndAdd()}
            />
            <div className="flex gap-1">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className={`h-5 w-5 rounded-full ${
                    newColor === color ? "ring-2 ring-white ring-offset-1 ring-offset-surface-light" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <button
              onClick={handleCreateAndAdd}
              disabled={!newName.trim()}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
