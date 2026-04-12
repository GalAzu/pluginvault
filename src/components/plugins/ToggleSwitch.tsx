import { useState } from "react"
import { enablePlugin, disablePlugin } from "../../lib/tauri"
import { useQueryClient } from "@tanstack/react-query"
import { useAppStore } from "../../stores/appStore"

interface ToggleSwitchProps {
  pluginId: string
  enabled: boolean
}

export function ToggleSwitch({ pluginId, enabled }: ToggleSwitchProps) {
  const [loading, setLoading] = useState(false)
  const [isEnabled, setIsEnabled] = useState(enabled)
  const queryClient = useQueryClient()
  const addToast = useAppStore((s) => s.addToast)

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (loading) return
    setLoading(true)

    try {
      if (isEnabled) {
        await disablePlugin(pluginId)
        setIsEnabled(false)
      } else {
        await enablePlugin(pluginId)
        setIsEnabled(true)
      }
      queryClient.invalidateQueries({ queryKey: ["plugins"] })
      queryClient.invalidateQueries({ queryKey: ["stats"] })
    } catch (err) {
      addToast("error", `Failed to toggle plugin: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${
        isEnabled ? "bg-success" : "bg-surface-lighter"
      } ${loading ? "opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 ${
          isEnabled ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  )
}
