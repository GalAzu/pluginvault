import { ArrowUp, ArrowDown } from "lucide-react"
import type { Plugin } from "../../lib/types"
import { PluginRow } from "./PluginRow"
import { useAppStore } from "../../stores/appStore"

interface PluginTableProps {
  plugins: Plugin[]
  sortBy: string
  sortDir: "asc" | "desc"
  onSort: (field: string) => void
}

const COLUMNS = [
  { key: "name", label: "Name" },
  { key: "format", label: "Format" },
  { key: "category", label: "Category" },
  { key: "file_size_bytes", label: "Size" },
  { key: "is_enabled", label: "Status" },
]

export function PluginTable({
  plugins,
  sortBy,
  sortDir,
  onSort,
}: PluginTableProps) {
  const selectedIds = useAppStore((s) => s.selectedPluginIds)
  const setSelectedPlugins = useAppStore((s) => s.setSelectedPlugins)

  const allSelected =
    plugins.length > 0 && selectedIds.length === plugins.length
  const someSelected = selectedIds.length > 0 && !allSelected

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedPlugins([])
    } else {
      setSelectedPlugins(plugins.map((p) => p.id))
    }
  }

  return (
    <div style={{ overflow: "auto", borderRadius: 12, border: "1px solid #2e3348" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #2e3348", background: "#1a1d27" }}>
            <th style={{ width: 40, padding: "12px" }}>
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected
                }}
                onChange={handleSelectAll}
                style={{ width: 16, height: 16, accentColor: "#6366f1" }}
              />
            </th>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => onSort(col.key)}
                style={{
                  cursor: "pointer",
                  padding: "12px",
                  textAlign: "left",
                  fontSize: 12,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  color: "#64748b",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {col.label}
                  {sortBy === col.key &&
                    (sortDir === "desc" ? (
                      <ArrowDown size={12} />
                    ) : (
                      <ArrowUp size={12} />
                    ))}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {plugins.map((plugin) => (
            <PluginRow key={plugin.id} plugin={plugin} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
