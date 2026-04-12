import { truncatePath } from "../../lib/utils"

interface ScanProgressProps {
  scanning: boolean
  message?: string
}

export function ScanProgressIndicator({ scanning, message }: ScanProgressProps) {
  if (!scanning) return null

  return (
    <div style={{
      borderRadius: 12,
      border: "1px solid rgba(34,211,238,0.3)",
      background: "rgba(34,211,238,0.05)",
      padding: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "#22d3ee" }}>Scanning...</span>
      </div>

      {/* Progress bar (indeterminate) */}
      <div style={{ height: 6, overflow: "hidden", borderRadius: 3, background: "#242836", marginBottom: 8 }}>
        <div style={{
          height: "100%",
          width: "33%",
          borderRadius: 3,
          background: "#22d3ee",
          animation: "pulse 1.5s ease-in-out infinite",
        }} />
      </div>

      {message && (
        <p style={{ fontSize: 12, color: "#64748b" }}>
          {truncatePath(message, 80)}
        </p>
      )}
    </div>
  )
}
