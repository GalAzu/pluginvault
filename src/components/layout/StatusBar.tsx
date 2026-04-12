import { useQuery } from "@tanstack/react-query"
import { getStats } from "../../lib/tauri"
import { useAppStore } from "../../stores/appStore"

export function StatusBar() {
  const scanInProgress = useAppStore((s) => s.scanInProgress)

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
  })

  return (
    <footer style={{
      display: "flex",
      height: 28,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "space-between",
      borderTop: "1px solid #2e3348",
      background: "#1a1d27",
      padding: "0 16px",
      fontSize: 12,
      color: "#64748b",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {stats && (
          <>
            <span>{stats.total} plugins</span>
            <span style={{ color: "#22c55e" }}>{stats.enabled} enabled</span>
            <span style={{ color: "#ef4444" }}>{stats.disabled} disabled</span>
          </>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {scanInProgress && (
          <span style={{ color: "#22d3ee" }}>
            Scanning...
          </span>
        )}
      </div>
    </footer>
  )
}
