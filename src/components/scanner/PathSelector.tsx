import { useState } from "react"
import { FolderOpen, Plus, Trash2 } from "lucide-react"
import { open } from "@tauri-apps/plugin-dialog"
import { addScanPath, removeScanPath } from "../../lib/tauri"
import { useAppStore } from "../../stores/appStore"
import type { ScanPath } from "../../lib/types"

interface PathSelectorProps {
  paths: ScanPath[]
  onUpdate: () => void
}

export function PathSelector({ paths, onUpdate }: PathSelectorProps) {
  const [adding, setAdding] = useState(false)
  const addToast = useAppStore((s) => s.addToast)

  const handleAdd = async () => {
    setAdding(true)
    try {
      const selected = await open({ directory: true, multiple: false })
      if (selected) {
        await addScanPath(selected as string)
        onUpdate()
        addToast("success", "Scan path added")
      }
    } catch (err) {
      addToast("error", `Failed to add path: ${err}`)
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (id: string) => {
    try {
      await removeScanPath(id)
      onUpdate()
      addToast("info", "Scan path removed")
    } catch (err) {
      addToast("error", `Failed to remove path: ${err}`)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {paths.map((p) => (
        <div
          key={p.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderRadius: 8,
            border: "1px solid #2e3348",
            background: "#242836",
            padding: "12px 16px",
          }}
        >
          <FolderOpen size={16} style={{ flexShrink: 0, color: "#64748b" }} />
          <span style={{ flex: 1, fontSize: 14, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {p.path}
          </span>
          {p.format && (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: "rgba(99,102,241,0.1)", color: "#818cf8" }}>
              {p.format}
            </span>
          )}
          <span style={{ fontSize: 12, color: p.is_enabled ? "#22c55e" : "#64748b" }}>
            {p.is_enabled ? "Active" : "Inactive"}
          </span>
          {p.is_default && (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: "rgba(234,179,8,0.1)", color: "#eab308" }}>
              Default
            </span>
          )}
          {!p.is_default && (
            <button
              onClick={() => handleRemove(p.id)}
              style={{ flexShrink: 0, color: "#64748b", background: "transparent", border: "none", cursor: "pointer" }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}

      <button
        onClick={handleAdd}
        disabled={adding}
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          borderRadius: 8,
          border: "1px dashed #2e3348",
          background: "transparent",
          padding: "12px 0",
          fontSize: 14,
          color: "#64748b",
          cursor: adding ? "wait" : "pointer",
        }}
      >
        <Plus size={16} />
        Add Scan Path
      </button>
    </div>
  )
}
