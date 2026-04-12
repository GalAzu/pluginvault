import { useNavigate } from "react-router-dom"
import type { Plugin } from "../../lib/types"
import { FormatBadge } from "./FormatBadge"
import { ToggleSwitch } from "./ToggleSwitch"

interface PluginCardProps {
  plugin: Plugin
}

export function PluginCard({ plugin }: PluginCardProps) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/plugins/${plugin.id}`)}
      style={{
        cursor: "pointer",
        borderRadius: 12,
        border: "1px solid #2e3348",
        background: "#1a1d27",
        padding: 16,
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.3)";
        (e.currentTarget as HTMLElement).style.background = "#242836"
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "#2e3348";
        (e.currentTarget as HTMLElement).style.background = "#1a1d27"
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontWeight: 500, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {plugin.name}
          </h3>
          {plugin.vendor && (
            <p style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {plugin.vendor}
            </p>
          )}
        </div>
        <ToggleSwitch pluginId={plugin.id} enabled={plugin.is_enabled} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <FormatBadge format={plugin.format} />
        {plugin.category && (
          <span style={{ fontSize: 12, color: "#94a3b8" }}>{plugin.category}</span>
        )}
      </div>
    </div>
  )
}
