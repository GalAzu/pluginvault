import { useNavigate } from "react-router-dom"
import type { Plugin } from "../../lib/types"
import { formatBytes } from "../../lib/utils"
import { FormatBadge } from "./FormatBadge"
import { ToggleSwitch } from "./ToggleSwitch"
import { useAppStore } from "../../stores/appStore"

interface PluginRowProps {
  plugin: Plugin
}

export function PluginRow({ plugin }: PluginRowProps) {
  const navigate = useNavigate()
  const selectedIds = useAppStore((s) => s.selectedPluginIds)
  const toggleSelection = useAppStore((s) => s.togglePluginSelection)
  const isSelected = selectedIds.includes(plugin.id)

  return (
    <tr
      onClick={() => navigate(`/plugins/${plugin.id}`)}
      className={`cursor-pointer border-b border-border/50 transition-colors hover:bg-surface-light ${
        isSelected ? "bg-primary/5" : ""
      }`}
    >
      <td className="w-10 px-3 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleSelection(plugin.id)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-border bg-surface-light accent-primary"
        />
      </td>
      <td className="px-3 py-3">
        <div className="font-medium text-text">{plugin.name}</div>
        {plugin.vendor && (
          <div className="text-xs text-muted">{plugin.vendor}</div>
        )}
      </td>
      <td className="px-3 py-3">
        <FormatBadge format={plugin.format} />
      </td>
      <td className="px-3 py-3 text-sm text-text-secondary">
        {plugin.category ?? "—"}
      </td>
      <td className="px-3 py-3 text-sm text-text-secondary">
        {formatBytes(plugin.file_size_bytes)}
      </td>
      <td className="px-3 py-3">
        <ToggleSwitch pluginId={plugin.id} enabled={plugin.is_enabled} />
      </td>
    </tr>
  )
}
