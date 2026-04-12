import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Plug,
  Power,
  PowerOff,
  Search,
  ArrowRight,
  Loader2,
} from "lucide-react"
import { getStats } from "../lib/tauri"
import { useNavigate } from "react-router-dom"
import { useScanner } from "../hooks/useScanner"
import { colors, formatColors, radii, shadows, spacing } from "../styles/tokens"

export function Dashboard() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
  })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { startScan, scanInProgress, scanProgress } = useScanner()

  const vendorCount = stats ? Object.keys(stats.by_vendor).length : 0

  const formatEntries = stats
    ? Object.entries(stats.by_format)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
    : []

  const handleScan = async () => {
    try {
      await startScan()
      await queryClient.invalidateQueries({ queryKey: ["stats"] })
    } catch {
      // toast handled in hook
    }
  }

  // First-run experience: no plugins yet
  if (!isLoading && !isError && stats?.total === 0) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: spacing.xl }}>Dashboard</h1>
        <div
          style={{
            textAlign: "center",
            padding: "80px 0",
            background: colors.surface,
            borderRadius: radii.xl,
            border: `1px solid ${colors.border}`,
          }}
        >
          <Plug size={56} style={{ margin: "0 auto 20px", opacity: 0.4, color: colors.primary }} />
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: colors.text }}>
            Welcome to PluginVault
          </h2>
          <p
            style={{
              fontSize: 15,
              color: colors.textSecondary,
              maxWidth: 420,
              margin: "0 auto 32px",
            }}
          >
            Scan your system to discover and manage all your audio plugins in one place.
          </p>
          <button
            onClick={handleScan}
            disabled={scanInProgress}
            style={{
              padding: "14px 32px",
              background: scanInProgress ? colors.surfaceLighter : colors.primary,
              color: "#fff",
              border: "none",
              borderRadius: radii.lg,
              fontSize: 15,
              fontWeight: 600,
              cursor: scanInProgress ? "default" : "pointer",
              opacity: scanInProgress ? 0.75 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              boxShadow: shadows.md,
            }}
          >
            {scanInProgress ? (
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Search size={18} />
            )}
            {scanInProgress ? "Scanning..." : "Scan Your Plugins"}
          </button>
          {scanInProgress && scanProgress && (
            <ScanProgressInline progress={scanProgress} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: spacing.xl,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Dashboard</h1>
        <button
          onClick={handleScan}
          disabled={scanInProgress}
          style={{
            padding: "8px 18px",
            background: scanInProgress ? colors.surfaceLighter : colors.primary,
            color: "#fff",
            border: "none",
            borderRadius: radii.md,
            fontSize: 13,
            fontWeight: 600,
            cursor: scanInProgress ? "default" : "pointer",
            opacity: scanInProgress ? 0.75 : 1,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {scanInProgress ? (
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <Search size={14} />
          )}
          {scanInProgress ? "Scanning..." : "Scan Now"}
        </button>
      </div>

      {/* Live scan progress banner */}
      {scanInProgress && scanProgress && (
        <div
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderLeft: `4px solid ${colors.primary}`,
            borderRadius: radii.lg,
            padding: spacing.lg,
            marginBottom: spacing.lg,
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: spacing.md,
              marginBottom: 8,
            }}
          >
            <Loader2
              size={16}
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

      {/* Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: spacing.lg,
          marginBottom: spacing.xxl,
        }}
      >
        <StatCard
          icon={<Plug size={20} />}
          label="Total Plugins"
          value={isLoading ? "..." : isError ? "—" : stats?.total ?? 0}
          color={colors.primary}
        />
        <StatCard
          icon={<Power size={20} />}
          label="Enabled"
          value={isLoading ? "..." : isError ? "—" : stats?.enabled ?? 0}
          color={colors.success}
        />
        <StatCard
          icon={<PowerOff size={20} />}
          label="Disabled"
          value={isLoading ? "..." : isError ? "—" : stats?.disabled ?? 0}
          color={colors.error}
        />
        <StatCard
          icon={<Plug size={20} />}
          label="Vendors"
          value={isLoading ? "..." : isError ? "—" : vendorCount}
          color={colors.accent}
        />
      </div>

      {/* Format Distribution */}
      {stats && stats.total > 0 && formatEntries.length > 0 && (
        <div
          style={{
            background: colors.surface,
            borderRadius: radii.lg,
            padding: spacing.xl,
            marginBottom: spacing.xl,
            border: `1px solid ${colors.border}`,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: spacing.lg }}>Plugin Formats</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {formatEntries.map(([format, count]) => {
              const pct = Math.round((count / stats.total) * 100)
              return (
                <div key={format} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 40, fontSize: 12, color: colors.textSecondary }}>{format}</span>
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      background: colors.surfaceLighter,
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: formatColors[format] ?? colors.mutedStrong,
                        borderRadius: 4,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      width: 50,
                      fontSize: 12,
                      color: colors.textSecondary,
                      textAlign: "right",
                    }}
                  >
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: spacing.md }}>
        <QuickAction icon={<Search size={20} />} label="Full Scan" onClick={() => navigate("/scanner")} />
        <QuickAction
          icon={<ArrowRight size={20} />}
          label="View All Plugins"
          onClick={() => navigate("/plugins")}
        />
      </div>
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

function ScanProgressInline({
  progress,
}: {
  progress: { phase: string; current_path: string; plugins_found: number; directories_scanned: number }
}) {
  return (
    <div style={{ marginTop: 24, fontSize: 12, color: colors.textSecondary }}>
      <div style={{ marginBottom: 4 }}>
        {labelForPhase(progress.phase)} — {progress.plugins_found} found · {progress.directories_scanned} dirs
      </div>
      {progress.current_path && (
        <div
          style={{
            fontFamily: "monospace",
            color: colors.muted,
            maxWidth: 500,
            margin: "0 auto",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={progress.current_path}
        >
          {progress.current_path}
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  color: string
}) {
  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: radii.lg,
        padding: 20,
        border: `1px solid ${colors.border}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ color }}>{icon}</div>
        <span style={{ fontSize: 13, color: colors.textSecondary }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: colors.text }}>{value}</div>
    </div>
  )
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: spacing.lg,
        background: colors.surface,
        borderRadius: radii.lg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        cursor: "pointer",
        fontSize: 14,
        textAlign: "left",
      }}
    >
      <div style={{ color: colors.primary }}>{icon}</div>
      {label}
    </button>
  )
}
