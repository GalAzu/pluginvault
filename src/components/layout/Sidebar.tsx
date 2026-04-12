import { Link, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Plug,
  FolderOpen,
  Search,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useAppStore } from "../../stores/appStore"
import { getStats } from "../../lib/tauri"

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/plugins", label: "Plugins", icon: Plug, showCount: true },
  { path: "/collections", label: "Collections", icon: FolderOpen },
  { path: "/scanner", label: "Scanner", icon: Search },
  { path: "/ai", label: "AI Assistant", icon: Sparkles },
  { path: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const location = useLocation()
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
  })

  return (
    <aside
      style={{
        display: "flex",
        height: "100%",
        flexDirection: "column",
        borderRight: "1px solid #2e3348",
        background: "#1a1d27",
        transition: "width 0.2s",
        width: collapsed ? 64 : 224,
      }}
    >
      {/* Logo */}
      <div style={{ height: 56, display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #2e3348", padding: "0 16px" }}>
        <div style={{
          width: 32, height: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 8, background: "#6366f1", fontSize: 12, fontWeight: 700, color: "#fff",
        }}>
          PV
        </div>
        {!collapsed && (
          <span style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>PluginVault</span>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path)

          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 14,
                textDecoration: "none",
                color: isActive ? "#818cf8" : "#64748b",
                background: isActive ? "rgba(99,102,241,0.15)" : "transparent",
              }}
            >
              <item.icon size={20} style={{ flexShrink: 0 }} />
              {!collapsed && (
                <>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.showCount && stats && (
                    <span style={{
                      borderRadius: 12, background: "#242836", padding: "2px 8px", fontSize: 12, color: "#94a3b8",
                    }}>
                      {stats.total}
                    </span>
                  )}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        style={{
          height: 40, display: "flex", alignItems: "center", justifyContent: "center",
          borderTop: "1px solid #2e3348", background: "none", border: "none",
          color: "#64748b", cursor: "pointer", borderTopStyle: "solid", borderTopWidth: 1, borderTopColor: "#2e3348",
        }}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  )
}
