import { useEffect, useState, useCallback } from "react"
import { X, Undo2, Loader2 } from "lucide-react"
import { getToggleHistory, undoToggleById } from "../../lib/tauri"
import { useAppStore } from "../../stores/appStore"
import type { ToggleHistoryEntry } from "../../lib/types"
import { colors, radii, shadows, spacing } from "../../styles/tokens"

interface Props {
  open: boolean
  onClose: () => void
}

export function ToggleHistoryPanel({ open, onClose }: Props) {
  const addToast = useAppStore((s) => s.addToast)
  const [entries, setEntries] = useState<ToggleHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [undoingId, setUndoingId] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getToggleHistory(20)
      setEntries(data)
    } catch (err) {
      addToast("error", `Failed to load history: ${err}`)
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    if (open) {
      fetchHistory()
    }
  }, [open, fetchHistory])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!open) return null

  const handleUndo = async (entry: ToggleHistoryEntry) => {
    setUndoingId(entry.id)
    try {
      const message = await undoToggleById(entry.id)
      addToast("success", message)
      await fetchHistory()
    } catch (err) {
      addToast("error", String(err))
    } finally {
      setUndoingId(null)
    }
  }

  const formatTime = (iso: string): string => {
    try {
      const d = new Date(iso)
      return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return iso
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        animation: "fadeIn 0.15s ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: colors.surface,
          borderRadius: radii.lg,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.lg,
          width: 560,
          maxWidth: "90%",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, color: colors.text }}>
            Recent Activity
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: colors.mutedStrong,
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: spacing.md }}>
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 0",
                color: colors.mutedStrong,
              }}
            >
              <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : entries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: colors.mutedStrong }}>
              <p style={{ fontSize: 14 }}>No toggle history yet.</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>
                Enable or disable plugins to see actions here.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {entries.map((entry) => {
                const isEnable = entry.action === "enable"
                const isUndoing = undoingId === entry.id
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: spacing.md,
                      padding: "10px 12px",
                      borderRadius: radii.md,
                      background: entry.undone ? "transparent" : colors.surfaceLighter,
                      opacity: entry.undone ? 0.5 : 1,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: colors.text,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.plugin_name}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 2,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: isEnable ? colors.success : colors.error,
                          }}
                        >
                          {isEnable ? "Enabled" : "Disabled"}
                        </span>
                        <span style={{ fontSize: 11, color: colors.mutedStrong }}>
                          {formatTime(entry.performed_at)}
                        </span>
                        {entry.undone && (
                          <span
                            style={{
                              fontSize: 10,
                              padding: "1px 6px",
                              borderRadius: radii.sm,
                              background: "rgba(100,116,139,0.2)",
                              color: colors.mutedStrong,
                            }}
                          >
                            Undone
                          </span>
                        )}
                      </div>
                    </div>
                    {!entry.undone && (
                      <button
                        onClick={() => handleUndo(entry)}
                        disabled={isUndoing}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "6px 10px",
                          borderRadius: radii.sm,
                          border: `1px solid ${colors.border}`,
                          background: "transparent",
                          color: colors.textSecondary,
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: isUndoing ? "wait" : "pointer",
                          opacity: isUndoing ? 0.5 : 1,
                        }}
                      >
                        {isUndoing ? (
                          <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                        ) : (
                          <Undo2 size={12} />
                        )}
                        Undo
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
