import { useState, useEffect } from "react"
import { Routes, Route, Link, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Plug,
  FolderOpen,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react"
import { Dashboard } from "./pages/Dashboard"
import { PluginList } from "./pages/PluginList"
import { PluginDetail } from "./pages/PluginDetail"
import { Collections } from "./pages/Collections"
import { Scanner } from "./pages/Scanner"
import { Settings } from "./pages/Settings"
import { useAppStore } from "./stores/appStore"
import { colors, radii, shadows, spacing } from "./styles/tokens"

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/plugins", label: "Plugins", icon: Plug },
  { path: "/collections", label: "Collections", icon: FolderOpen },
  { path: "/settings", label: "Settings", icon: SettingsIcon },
]

function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts)
  const removeToast = useAppStore((s) => s.removeToast)

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} id={toast.id} type={toast.type} message={toast.message} onClose={removeToast} />
      ))}
    </div>
  )
}

function ToastItem({
  id,
  type,
  message,
  onClose,
}: {
  id: string
  type: "success" | "error" | "info"
  message: string
  onClose: (id: string) => void
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onClose(id), 300)
    }, 4000)
    return () => clearTimeout(timer)
  }, [id, onClose])

  const borderColor =
    type === "success" ? colors.success : type === "error" ? colors.error : colors.info

  return (
    <div
      style={{
        pointerEvents: "auto",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: radii.md,
        minWidth: 280,
        maxWidth: 400,
        boxShadow: shadows.md,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(20px)",
        transition: "opacity 0.3s, transform 0.3s",
      }}
    >
      <span style={{ fontSize: 13, color: colors.text, flex: 1 }}>{message}</span>
      <button
        onClick={() => onClose(id)}
        style={{
          background: "transparent",
          border: "none",
          color: colors.mutedStrong,
          cursor: "pointer",
          padding: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function App() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: colors.bg,
        color: colors.text,
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: collapsed ? 64 : 220,
          background: colors.surface,
          borderRight: `1px solid ${colors.border}`,
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s",
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: 56,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 16px",
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: radii.md,
              background: colors.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            PV
          </div>
          {!collapsed && <span style={{ fontSize: 14, fontWeight: 600 }}>PluginVault</span>}
        </div>

        {/* Nav */}
        <nav
          style={{
            flex: 1,
            padding: spacing.sm,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 12px",
                  borderRadius: radii.md,
                  fontSize: 14,
                  textDecoration: "none",
                  color: isActive ? colors.primaryHover : colors.muted,
                  background: isActive ? "rgba(124,140,250,0.15)" : "transparent",
                }}
              >
                <item.icon size={20} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderTop: `1px solid ${colors.border}`,
            background: "none",
            border: "none",
            color: colors.mutedStrong,
            cursor: "pointer",
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto", padding: spacing.xl }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/plugins" element={<PluginList />} />
          <Route path="/plugins/:id" element={<PluginDetail />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  )
}
