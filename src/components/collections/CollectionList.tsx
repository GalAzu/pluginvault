import { FolderOpen, Trash2, Sparkles } from "lucide-react"
import type { Collection } from "../../lib/types"
import { cn } from "../../lib/utils"

interface CollectionListProps {
  collections: Collection[]
  selectedId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function CollectionList({
  collections,
  selectedId,
  onSelect,
  onDelete,
}: CollectionListProps) {
  return (
    <div className="space-y-1">
      {collections.map((col) => (
        <div
          key={col.id}
          onClick={() => onSelect(col.id)}
          className={cn(
            "group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
            selectedId === col.id
              ? "bg-primary/15 text-primary"
              : "text-text-secondary hover:bg-surface-light hover:text-text"
          )}
        >
          {col.is_smart ? (
            <Sparkles size={16} className="shrink-0" />
          ) : (
            <FolderOpen size={16} className="shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{col.name}</p>
            {col.description && (
              <p className="truncate text-xs text-muted">{col.description}</p>
            )}
          </div>
          <span className="text-xs text-muted">{col.plugin_count}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(col.id)
            }}
            className="hidden shrink-0 text-muted hover:text-error group-hover:block"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
