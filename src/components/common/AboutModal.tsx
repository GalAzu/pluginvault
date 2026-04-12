import { useEffect } from "react"
import { X, ExternalLink, Mail, Shield } from "lucide-react"
import { colors, radii, shadows, spacing } from "../../styles/tokens"

interface Props {
  open: boolean
  onClose: () => void
}

export function AboutModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!open) return null

  const linkStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: radii.md,
    border: `1px solid ${colors.border}`,
    background: "transparent",
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 500,
    textDecoration: "none",
    cursor: "pointer",
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
          width: 460,
          maxWidth: "90%",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "12px 16px 0",
          }}
        >
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
        <div style={{ padding: "0 32px 32px", textAlign: "center" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: radii.xl,
              background: colors.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              color: "#fff",
              fontSize: 28,
              fontWeight: 700,
              boxShadow: shadows.md,
            }}
          >
            PV
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.text, marginBottom: 6 }}>
            PluginVault v1.0.0
          </h2>
          <p style={{ fontSize: 13, color: colors.textSecondary, marginBottom: spacing.xl }}>
            Free open-source audio plugin manager
          </p>

          {/* Privacy */}
          <div
            style={{
              background: colors.surfaceLighter,
              borderRadius: radii.md,
              padding: spacing.lg,
              marginBottom: spacing.xl,
              textAlign: "left",
              border: `1px solid ${colors.border}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
                color: colors.success,
              }}
            >
              <Shield size={14} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>Privacy First</span>
            </div>
            <p style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.5 }}>
              PluginVault runs entirely on your device. Plugin data is stored locally in SQLite.
              No telemetry, no tracking, no cloud sync.
            </p>
          </div>

          {/* Links */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: spacing.sm,
              marginBottom: spacing.xl,
              flexWrap: "wrap",
            }}
          >
            <a
              href="https://github.com/autonomous/pluginvault"
              target="_blank"
              rel="noreferrer"
              style={linkStyle}
            >
              <ExternalLink size={12} />
              GitHub
            </a>
            <a href="mailto:support@autonomous.dev" style={linkStyle}>
              <Mail size={12} />
              Support
            </a>
          </div>

          <p style={{ fontSize: 11, color: colors.mutedStrong }}>
            Built by Autonomous. MIT License.
          </p>
        </div>
      </div>
    </div>
  )
}
