import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { getScanPaths, addScanPath, removeScanPath } from "../lib/tauri"
import { useAppStore } from "../stores/appStore"
import { useScanner } from "../hooks/useScanner"
import type { ScanSummary, ScanPath } from "../lib/types"
import { colors, radii, spacing } from "../styles/tokens"

export function Scanner() {
  const queryClient = useQueryClient()
  const addToast = useAppStore((s) => s.addToast)
  const { startScan, scanInProgress, scanProgress } = useScanner()
  const [lastSummary, setLastSummary] = useState<ScanSummary | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  const { data: paths = [] } = useQuery({
    queryKey: ["scanPaths"],
    queryFn: getScanPaths,
  })

  const handleAddPath = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog")
      const selected = await open({ directory: true, multiple: false })
      if (selected) {
        await addScanPath(selected as string)
        queryClient.invalidateQueries({ queryKey: ["scanPaths"] })
        addToast("success", "Scan path added")
      }
    } catch (err) {
      addToast("error", String(err))
    }
  }

  const handleRemovePath = async (id: string) => {
    try {
      await removeScanPath(id)
      queryClient.invalidateQueries({ queryKey: ["scanPaths"] })
      addToast("info", "Scan path removed")
    } catch (err) {
      addToast("error", String(err))
    }
  }

  const handleScan = async () => {
    setScanError(null)
    setLastSummary(null)
    try {
      const summary = await startScan()
      if (summary) setLastSummary(summary)
    } catch (err) {
      setScanError(String(err))
    }
  }

  const cardStyle: React.CSSProperties = {
    background: colors.surface,
    borderRadius: radii.lg,
    border: `1px solid ${colors.border}`,
    padding: 20,
    marginBottom: spacing.lg,
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: spacing.xl, color: colors.text }}>
        Scanner
      </h1>

      {/* Scan paths */}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: spacing.lg,
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>Scan Directories</h2>
          <button
            onClick={handleAddPath}
            style={{
              padding: "6px 14px",
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              background: "transparent",
              color: colors.textSecondary,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            + Add Path
          </button>
        </div>

        {paths.length === 0 ? (
          <p
            style={{
              fontSize: 13,
              color: colors.mutedStrong,
              textAlign: "center",
              padding: "20px 0",
            }}
          >
            No scan directories configured. Add a path to get started.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {paths.map((sp: ScanPath) => (
              <div
                key={sp.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  background: colors.surfaceLighter,
                  borderRadius: radii.md,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: colors.textSecondary,
                    flex: 1,
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                  }}
                >
                  {sp.path}
                </span>
                {sp.format && (
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: radii.md,
                      background: "rgba(124,140,250,0.1)",
                      color: colors.primaryHover,
                    }}
                  >
                    {sp.format}
                  </span>
                )}
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: radii.md,
                    background: sp.is_enabled ? colors.successBg : colors.errorBg,
                    color: sp.is_enabled ? colors.success : colors.error,
                  }}
                >
                  {sp.is_enabled ? "Active" : "Inactive"}
                </span>
                {sp.is_default && (
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: radii.md,
                      background: colors.warningBg,
                      color: colors.warning,
                    }}
                  >
                    Default
                  </span>
                )}
                {!sp.is_default && (
                  <button
                    onClick={() => handleRemovePath(sp.id)}
                    aria-label="Remove path"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: colors.mutedStrong,
                      cursor: "pointer",
                      fontSize: 16,
                      padding: "0 4px",
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scan button */}
      <button
        onClick={handleScan}
        disabled={scanInProgress}
        style={{
          width: "100%",
          padding: "14px 0",
          borderRadius: radii.lg,
          border: "none",
          background: scanInProgress ? colors.surfaceLighter : colors.primary,
          color: "#fff",
          fontSize: 14,
          fontWeight: 600,
          cursor: scanInProgress ? "default" : "pointer",
          opacity: scanInProgress ? 0.75 : 1,
          marginBottom: spacing.lg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {scanInProgress && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
        {scanInProgress ? "Scanning..." : "Start Full Scan"}
      </button>

      {/* Live progress */}
      {scanInProgress && scanProgress && (
        <div
          style={{
            ...cardStyle,
            borderLeft: `4px solid ${colors.primary}`,
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: spacing.md, marginBottom: 8 }}>
            <Loader2
              size={14}
              style={{ color: colors.primary, animation: "spin 1s linear infinite" }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
              {labelForPhase(scanProgress.phase)}
            </span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: colors.textSecondary }}>
              {scanProgress.plugins_found} found · {scanProgress.directories_scanned} dirs
            </span>
          </div>
          {scanProgress.current_path && (
            <div
              style={{
                fontSize: 11,
                color: colors.muted,
                fontFamily: "monospace",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={scanProgress.current_path}
            >
              {scanProgress.current_path}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {scanError && (
        <div
          style={{
            ...cardStyle,
            borderColor: "rgba(239,68,68,0.3)",
            background: "rgba(239,68,68,0.05)",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: colors.error }}
          >
            <span style={{ fontWeight: 600 }}>Scan Error</span>
          </div>
          <p style={{ fontSize: 13, color: colors.textSecondary }}>{scanError}</p>
        </div>
      )}

      {/* Results */}
      {!scanInProgress && lastSummary && (
        <div
          style={{
            ...cardStyle,
            borderColor: "rgba(34,197,94,0.3)",
            background: "rgba(34,197,94,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: spacing.lg,
              color: colors.success,
            }}
          >
            <span style={{ fontSize: 18 }}>&#10003;</span>
            <span style={{ fontWeight: 600 }}>Scan Complete</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <SummaryRow label="Total Found" value={lastSummary.total_found} />
            <SummaryRow
              label="New Plugins"
              value={lastSummary.new_plugins}
              highlight={lastSummary.new_plugins > 0}
            />
            <SummaryRow label="Updated" value={lastSummary.updated_plugins} />
            <SummaryRow label="Duration" value={`${lastSummary.scan_duration_ms}ms`} />
          </div>
          {lastSummary.paths_scanned.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <span style={{ fontSize: 12, color: colors.mutedStrong }}>
                Paths scanned: {lastSummary.paths_scanned.length}
              </span>
            </div>
          )}
          {lastSummary.errors.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <span style={{ fontSize: 12, color: colors.error, fontWeight: 600 }}>
                {lastSummary.errors.length} error(s):
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                {lastSummary.errors.map((err, i) => (
                  <span key={i} style={{ fontSize: 12, color: colors.textSecondary }}>
                    {err}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function labelForPhase(phase: string): string {
  switch (phase) {
    case "starting":
      return "Preparing scan..."
    case "walking":
      return "Scanning directories..."
    case "hashing":
      return "Identifying plugins..."
    case "saving":
      return "Saving results..."
    case "done":
      return "Finalizing..."
    default:
      return "Scanning..."
  }
}

function SummaryRow({
  label,
  value,
  highlight,
  warning,
}: {
  label: string
  value: number | string
  highlight?: boolean
  warning?: boolean
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 13, color: colors.textSecondary }}>{label}</span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: warning ? colors.error : highlight ? colors.accent : colors.text,
        }}
      >
        {value}
      </span>
    </div>
  )
}
