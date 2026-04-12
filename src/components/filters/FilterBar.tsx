import { useState } from "react"
import { Filter, X } from "lucide-react"

const FORMATS = ["VST3", "VST2", "AU", "AAX", "CLAP"]
const CATEGORIES = [
  "Instrument",
  "Effect",
  "Analyzer",
  "MIDI",
  "Utility",
  "Other",
]

interface FilterBarProps {
  selectedFormat: string | null
  selectedCategory: string | null
  enabledFilter: boolean | undefined
  onFormatChange: (format: string | null) => void
  onCategoryChange: (category: string | null) => void
  onEnabledChange: (enabled: boolean | undefined) => void
}

export function FilterBar({
  selectedFormat,
  selectedCategory,
  enabledFilter,
  onFormatChange,
  onCategoryChange,
  onEnabledChange,
}: FilterBarProps) {
  const [expanded, setExpanded] = useState(false)

  const activeCount =
    (selectedFormat ? 1 : 0) +
    (selectedCategory ? 1 : 0) +
    (enabledFilter !== undefined ? 1 : 0)

  const clearAll = () => {
    onFormatChange(null)
    onCategoryChange(null)
    onEnabledChange(undefined)
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: "flex",
            height: 36,
            alignItems: "center",
            gap: 8,
            borderRadius: 8,
            border: activeCount > 0 ? "1px solid rgba(99,102,241,0.3)" : "1px solid #2e3348",
            background: activeCount > 0 ? "rgba(99,102,241,0.1)" : "#242836",
            color: activeCount > 0 ? "#6366f1" : "#94a3b8",
            padding: "0 12px",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          <Filter size={14} />
          Filters
          {activeCount > 0 && (
            <span style={{
              display: "flex", width: 20, height: 20, alignItems: "center", justifyContent: "center",
              borderRadius: 10, background: "#6366f1", fontSize: 11, color: "#fff",
            }}>
              {activeCount}
            </span>
          )}
        </button>

        {activeCount > 0 && (
          <button
            onClick={clearAll}
            style={{
              display: "flex", height: 36, alignItems: "center", gap: 4,
              borderRadius: 8, padding: "0 8px", fontSize: 12, color: "#64748b",
              background: "transparent", border: "none", cursor: "pointer",
            }}
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>

      {expanded && (
        <div style={{
          marginTop: 12,
          borderRadius: 12,
          border: "1px solid #2e3348",
          background: "#1a1d27",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}>
          {/* Format filter */}
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "#64748b" }}>
              Format
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {FORMATS.map((format) => (
                <button
                  key={format}
                  onClick={() => onFormatChange(selectedFormat === format ? null : format)}
                  style={{
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    background: selectedFormat === format ? "rgba(99,102,241,0.15)" : "#242836",
                    color: selectedFormat === format ? "#6366f1" : "#94a3b8",
                  }}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>

          {/* Category filter */}
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "#64748b" }}>
              Category
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onCategoryChange(selectedCategory === cat ? null : cat)}
                  style={{
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    background: selectedCategory === cat ? "rgba(99,102,241,0.15)" : "#242836",
                    color: selectedCategory === cat ? "#6366f1" : "#94a3b8",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Enabled/Disabled filter */}
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "#64748b" }}>
              Status
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: "All", value: undefined },
                { label: "Enabled", value: true },
                { label: "Disabled", value: false },
              ].map((option) => (
                <button
                  key={String(option.value)}
                  onClick={() => onEnabledChange(option.value)}
                  style={{
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    background: enabledFilter === option.value ? "rgba(99,102,241,0.15)" : "#242836",
                    color: enabledFilter === option.value ? "#6366f1" : "#94a3b8",
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
