import { useState } from "react"
import { autoCategorize, detectDuplicates, suggestCleanup } from "../lib/tauri"
import type { AICategorization, DuplicateGroup, CleanupSuggestion } from "../lib/types"

type View = "menu" | "categorize" | "duplicates" | "cleanup"

export function AIAssistant() {
  const [view, setView] = useState<View>("menu")
  const [loading, setLoading] = useState(false)
  const [useAi, setUseAi] = useState(false)
  const [categories, setCategories] = useState<AICategorization[]>([])
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([])
  const [cleanupSuggestions, setCleanupSuggestions] = useState<CleanupSuggestion[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleCategorize = async () => {
    setLoading(true)
    setError(null)
    setView("categorize")
    try {
      const result = await autoCategorize(useAi)
      setCategories(result)
    } catch (err) {
      setError(`Auto-categorize failed: ${err}`)
      setView("menu")
    } finally {
      setLoading(false)
    }
  }

  const handleDuplicates = async () => {
    setLoading(true)
    setError(null)
    setView("duplicates")
    try {
      const result = await detectDuplicates()
      setDuplicates(result)
    } catch (err) {
      setError(`Duplicate detection failed: ${err}`)
      setView("menu")
    } finally {
      setLoading(false)
    }
  }

  const handleCleanup = async () => {
    setLoading(true)
    setError(null)
    setView("cleanup")
    try {
      const result = await suggestCleanup()
      setCleanupSuggestions(result)
    } catch (err) {
      setError(`Cleanup analysis failed: ${err}`)
      setView("menu")
    } finally {
      setLoading(false)
    }
  }

  const cardStyle: React.CSSProperties = {
    background: "#1a1d27",
    borderRadius: 12,
    border: "1px solid #2e3348",
    padding: 20,
  }

  const severityColor = (severity: string): string => {
    switch (severity.toLowerCase()) {
      case "high": return "#ef4444"
      case "medium": return "#eab308"
      case "low": return "#22c55e"
      default: return "#94a3b8"
    }
  }

  // Sub-view (results)
  if (view !== "menu") {
    const titles: Record<string, string> = {
      categorize: "Auto-Categorize",
      duplicates: "Duplicate Detection",
      cleanup: "Cleanup Suggestions",
    }

    return (
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => setView("menu")}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "1px solid #2e3348",
              background: "transparent",
              color: "#64748b",
              cursor: "pointer",
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ←
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>{titles[view]}</h1>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div
              style={{
                width: 32,
                height: 32,
                border: "3px solid #2e3348",
                borderTopColor: "#22d3ee",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            <p style={{ fontSize: 14, color: "#64748b" }}>Analyzing your plugins...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {/* Categorize results */}
            {view === "categorize" && (
              <div>
                {categories.length === 0 ? (
                  <p style={{ textAlign: "center", padding: "40px 0", color: "#64748b", fontSize: 14 }}>
                    All plugins are already categorized.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {categories.map((cat) => (
                      <div key={cat.plugin_id} style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                            Plugin: {cat.plugin_id.slice(0, 8)}...
                          </div>
                          <div style={{ fontSize: 13, color: "#94a3b8" }}>
                            {cat.category}{cat.subcategory ? ` / ${cat.subcategory}` : ""}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                            Source: {cat.source}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: cat.confidence > 0.8 ? "#22c55e" : cat.confidence > 0.5 ? "#eab308" : "#ef4444",
                          }}
                        >
                          {Math.round(cat.confidence * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Duplicates results */}
            {view === "duplicates" && (
              <div>
                {duplicates.length === 0 ? (
                  <p style={{ textAlign: "center", padding: "40px 0", color: "#64748b", fontSize: 14 }}>
                    No duplicates found. Your library is clean.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {duplicates.map((group, gi) => (
                      <div key={gi} style={cardStyle}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{group.reason}</div>
                        <div style={{ fontSize: 12, color: "#22d3ee", marginBottom: 10 }}>{group.recommendation}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {group.members.map((m) => (
                            <div
                              key={m.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "8px 12px",
                                background: "#242836",
                                borderRadius: 8,
                                fontSize: 13,
                              }}
                            >
                              <div>
                                <span style={{ color: "#e2e8f0" }}>{m.name}</span>
                                {m.vendor && <span style={{ color: "#64748b", marginLeft: 8 }}>by {m.vendor}</span>}
                                {m.version && <span style={{ color: "#64748b", marginLeft: 8 }}>v{m.version}</span>}
                              </div>
                              <span style={{ color: "#64748b", fontSize: 12 }}>{m.format}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Cleanup results */}
            {view === "cleanup" && (
              <div>
                {cleanupSuggestions.length === 0 ? (
                  <p style={{ textAlign: "center", padding: "40px 0", color: "#64748b", fontSize: 14 }}>
                    Your plugin library looks clean.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {cleanupSuggestions.map((suggestion, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "12px 16px",
                          background: "#242836",
                          borderRadius: 8,
                          border: "1px solid #2e3348",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 500, color: "#e2e8f0" }}>{suggestion.plugin_name}</span>
                          <div style={{ display: "flex", gap: 8 }}>
                            <span style={{
                              fontSize: 11,
                              padding: "2px 8px",
                              borderRadius: 8,
                              background: severityColor(suggestion.severity) + "15",
                              color: severityColor(suggestion.severity),
                              fontWeight: 600,
                            }}>
                              {suggestion.severity}
                            </span>
                            <span style={{
                              fontSize: 11,
                              padding: "2px 8px",
                              borderRadius: 8,
                              background: "rgba(99,102,241,0.1)",
                              color: "#818cf8",
                            }}>
                              {suggestion.suggestion_type}
                            </span>
                          </div>
                        </div>
                        <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5, margin: 0 }}>
                          {suggestion.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // Main menu
  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>AI Assistant</h1>
      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
        Use AI to organize, categorize, and clean up your plugin library.
      </p>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 8,
            color: "#ef4444",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* AI toggle */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 16,
        padding: "10px 14px",
        background: "#1a1d27",
        borderRadius: 8,
        border: "1px solid #2e3348",
      }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={useAi}
            onChange={(e) => setUseAi(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: "#6366f1" }}
          />
          <span style={{ fontSize: 13, color: "#94a3b8" }}>
            Use AI provider for categorization (requires configured API key in Settings)
          </span>
        </label>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Auto-Categorize */}
        <button
          onClick={handleCategorize}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: 20,
            background: "#1a1d27",
            borderRadius: 12,
            border: "1px solid #2e3348",
            cursor: "pointer",
            textAlign: "left",
            color: "#e2e8f0",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(34,211,238,0.3)"
            ;(e.currentTarget as HTMLElement).style.background = "#242836"
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "#2e3348"
            ;(e.currentTarget as HTMLElement).style.background = "#1a1d27"
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "rgba(34,211,238,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
              color: "#22d3ee",
            }}
          >
            &#10024;
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Auto-Categorize</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Automatically assign categories to uncategorized plugins
            </div>
          </div>
        </button>

        {/* Find Duplicates */}
        <button
          onClick={handleDuplicates}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: 20,
            background: "#1a1d27",
            borderRadius: 12,
            border: "1px solid #2e3348",
            cursor: "pointer",
            textAlign: "left",
            color: "#e2e8f0",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.3)"
            ;(e.currentTarget as HTMLElement).style.background = "#242836"
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "#2e3348"
            ;(e.currentTarget as HTMLElement).style.background = "#1a1d27"
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "rgba(99,102,241,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
              color: "#6366f1",
            }}
          >
            &#128203;
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Find Duplicates</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Detect duplicate plugins and choose which versions to keep
            </div>
          </div>
        </button>

        {/* Cleanup Suggestions */}
        <button
          onClick={handleCleanup}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: 20,
            background: "#1a1d27",
            borderRadius: 12,
            border: "1px solid #2e3348",
            cursor: "pointer",
            textAlign: "left",
            color: "#e2e8f0",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(234,179,8,0.3)"
            ;(e.currentTarget as HTMLElement).style.background = "#242836"
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "#2e3348"
            ;(e.currentTarget as HTMLElement).style.background = "#1a1d27"
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "rgba(234,179,8,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
              color: "#eab308",
            }}
          >
            &#128465;
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Cleanup Suggestions</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Get recommendations for cleaning up your plugin library
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
