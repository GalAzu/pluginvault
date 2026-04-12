import { useState } from "react"
import { Check, X } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import type { AICategorization } from "../../lib/types"
import { updatePlugin } from "../../lib/tauri"
import { useAppStore } from "../../stores/appStore"

interface CategorySuggestionsProps {
  suggestions: AICategorization[]
  pluginNames: Record<string, string>
}

export function CategorySuggestions({
  suggestions,
  pluginNames,
}: CategorySuggestionsProps) {
  const [processed, setProcessed] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()
  const addToast = useAppStore((s) => s.addToast)

  const handleAccept = async (s: AICategorization) => {
    try {
      await updatePlugin(s.plugin_id, {
        category: s.category,
        subcategory: s.subcategory ?? undefined,
      })
      setProcessed((prev) => new Set(prev).add(s.plugin_id))
      queryClient.invalidateQueries({ queryKey: ["plugins"] })
    } catch (err) {
      addToast("error", `Failed to apply category: ${err}`)
    }
  }

  const handleReject = (s: AICategorization) => {
    setProcessed((prev) => new Set(prev).add(s.plugin_id))
  }

  const remaining = suggestions.filter((s) => !processed.has(s.plugin_id))

  if (remaining.length === 0) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center", fontSize: 14, color: "#64748b" }}>
        All suggestions have been processed.
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {remaining.map((s) => (
        <div
          key={s.plugin_id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            borderRadius: 8,
            border: "1px solid #2e3348",
            background: "#242836",
            padding: "12px 16px",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {pluginNames[s.plugin_id] ?? s.plugin_id}
            </p>
            <p style={{ fontSize: 12, color: "#94a3b8" }}>
              {s.category}
              {s.subcategory && ` / ${s.subcategory}`}
              <span style={{ marginLeft: 8, color: "#64748b" }}>
                {Math.round(s.confidence * 100)}% confidence
              </span>
              <span style={{ marginLeft: 8, color: "#64748b" }}>
                ({s.source})
              </span>
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={() => handleAccept(s)}
              style={{
                display: "flex", width: 28, height: 28, alignItems: "center", justifyContent: "center",
                borderRadius: 6, background: "transparent", border: "none", color: "#22c55e", cursor: "pointer",
              }}
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => handleReject(s)}
              style={{
                display: "flex", width: 28, height: 28, alignItems: "center", justifyContent: "center",
                borderRadius: 6, background: "transparent", border: "none", color: "#ef4444", cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
