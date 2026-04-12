import { useState, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { History, Info } from "lucide-react"
import { getSettings, updateSettings } from "../lib/tauri"
import { useAppStore } from "../stores/appStore"
import { ToggleHistoryPanel } from "../components/common/ToggleHistoryPanel"
import { AboutModal } from "../components/common/AboutModal"
import { colors, radii, spacing } from "../styles/tokens"

export function Settings() {
  const queryClient = useQueryClient()
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  })

  const [form, setForm] = useState({
    disabled_folder: "",
    toggle_method: "move",
    auto_scan_on_launch: true,
  })

  useEffect(() => {
    if (settings) {
      setForm({
        disabled_folder: settings.disabled_folder,
        toggle_method: settings.toggle_method,
        auto_scan_on_launch: settings.auto_scan_on_launch,
      })
    }
  }, [settings])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: Record<string, string> = {
        disabled_folder: form.disabled_folder,
        toggle_method: form.toggle_method,
        auto_scan_on_launch: String(form.auto_scan_on_launch),
      }
      await updateSettings(payload)
      queryClient.invalidateQueries({ queryKey: ["settings"] })
      addToast("success", "Settings saved")
    } catch (err) {
      addToast("error", String(err))
    } finally {
      setSaving(false)
    }
  }

  const cardStyle: React.CSSProperties = {
    background: colors.surface,
    borderRadius: radii.lg,
    border: `1px solid ${colors.border}`,
    padding: 20,
    marginBottom: spacing.lg,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: colors.mutedStrong,
    display: "block",
    marginBottom: 6,
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 36,
    padding: "0 12px",
    background: colors.surfaceLighter,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    color: colors.text,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  }

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    paddingRight: 32,
  }

  const actionRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: colors.surfaceLighter,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    cursor: "pointer",
    color: colors.text,
    fontSize: 14,
    width: "100%",
    textAlign: "left",
  }

  if (isLoading) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: spacing.xl, color: colors.text }}>
          Settings
        </h1>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            style={{
              height: 80,
              background: colors.surface,
              borderRadius: radii.lg,
              marginBottom: spacing.lg,
              animation: "pulseFade 1.4s ease-in-out infinite",
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: spacing.xl,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text }}>Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 20px",
            borderRadius: radii.md,
            border: "none",
            background: colors.primary,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* General */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: spacing.lg, color: colors.text }}>
          General
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg }}>
          <div>
            <label style={labelStyle}>Disabled Plugins Folder</label>
            <input
              type="text"
              value={form.disabled_folder}
              onChange={(e) => setForm({ ...form, disabled_folder: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Toggle Method</label>
            <select
              value={form.toggle_method}
              onChange={(e) => setForm({ ...form, toggle_method: e.target.value })}
              style={selectStyle}
            >
              <option value="move">Move to disabled folder</option>
              <option value="rename">Rename file extension</option>
            </select>
          </div>
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.auto_scan_on_launch}
                onChange={(e) => setForm({ ...form, auto_scan_on_launch: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: colors.primary }}
              />
              <span style={{ fontSize: 13, color: colors.textSecondary }}>
                Automatically scan for plugins when the app starts
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Activity & info */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: spacing.lg, color: colors.text }}>
          Activity & Info
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
          <button onClick={() => setHistoryOpen(true)} style={actionRowStyle}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: spacing.md }}>
              <History size={16} style={{ color: colors.primary }} />
              Recent Activity
            </span>
            <span style={{ fontSize: 12, color: colors.mutedStrong }}>Undo toggle actions</span>
          </button>
          <button onClick={() => setAboutOpen(true)} style={actionRowStyle}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: spacing.md }}>
              <Info size={16} style={{ color: colors.primary }} />
              About PluginVault
            </span>
            <span style={{ fontSize: 12, color: colors.mutedStrong }}>v1.0.0</span>
          </button>
        </div>
      </div>

      {/* Version */}
      <div
        style={{ textAlign: "center", padding: "20px 0", color: colors.mutedStrong, fontSize: 12 }}
      >
        PluginVault v1.0.0
      </div>

      <ToggleHistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  )
}
