import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Download, Layers, List as ListIcon, ChevronDown, ChevronRight, Power, PowerOff, X, FolderInput, FolderTree } from "lucide-react"
import {
  getPlugins,
  enablePlugin,
  disablePlugin,
  exportPluginsToFile,
  bulkEnablePlugins,
  bulkDisablePlugins,
  bulkMovePlugins,
  autoOrganizeByVendor,
} from "../lib/tauri"
import type { BulkResult } from "../lib/tauri"
import { useAppStore } from "../stores/appStore"
import type { Plugin, PluginFilter } from "../lib/types"
import { colors, formatColors, radii, spacing } from "../styles/tokens"

const ALL_FORMATS = ["VST3", "VST2", "AU", "AAX", "CLAP"]

export function PluginList() {
  const navigate = useNavigate()
  const addToast = useAppStore((s) => s.addToast)
  const [search, setSearch] = useState("")
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [groupByVendor, setGroupByVendor] = useState(false)
  const [collapsedVendors, setCollapsedVendors] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [organizing, setOrganizing] = useState(false)

  const filter: PluginFilter = useMemo(
    () => ({
      search: search || undefined,
      format: selectedFormat ?? undefined,
      sort_by: sortBy,
      sort_dir: sortDir,
    }),
    [search, selectedFormat, sortBy, sortDir],
  )

  const { data: plugins = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["plugins", filter],
    queryFn: () => getPlugins(filter),
  })

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortDir("asc")
    }
  }

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    setTogglingId(id)
    try {
      const message = currentEnabled ? await disablePlugin(id) : await enablePlugin(id)
      addToast("success", message)
      refetch()
    } catch (err) {
      addToast("error", String(err))
    } finally {
      setTogglingId(null)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const { save } = await import("@tauri-apps/plugin-dialog")
      const dest = await save({
        defaultPath: "plugins.csv",
        filters: [{ name: "CSV", extensions: ["csv"] }],
      })
      if (dest) {
        await exportPluginsToFile(dest as string, "csv")
        addToast("success", "Plugins exported")
      }
    } catch (err) {
      addToast("error", `Export failed: ${err}`)
    } finally {
      setExporting(false)
    }
  }

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === plugins.length && plugins.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(plugins.map((p) => p.id)))
    }
  }

  const clearSelection = () => setSelected(new Set())

  const summarizeBulk = (result: BulkResult, verb: string): string => {
    if (result.failed === 0) return `${verb} ${result.succeeded} plugins`
    if (result.succeeded === 0) return `${verb} failed for all ${result.failed} plugins`
    return `${verb} ${result.succeeded}, ${result.failed} failed`
  }

  const handleBulkEnable = async () => {
    if (selected.size === 0) return
    setBulkBusy(true)
    try {
      const result = await bulkEnablePlugins(Array.from(selected))
      addToast(result.failed > 0 ? "info" : "success", summarizeBulk(result, "Enabled"))
      if (result.errors.length > 0) {
        for (const err of result.errors.slice(0, 3)) addToast("error", err)
      }
      refetch()
      clearSelection()
    } catch (err) {
      addToast("error", String(err))
    } finally {
      setBulkBusy(false)
    }
  }

  const handleBulkDisable = async () => {
    if (selected.size === 0) return
    setBulkBusy(true)
    try {
      const result = await bulkDisablePlugins(Array.from(selected))
      addToast(result.failed > 0 ? "info" : "success", summarizeBulk(result, "Disabled"))
      if (result.errors.length > 0) {
        for (const err of result.errors.slice(0, 3)) addToast("error", err)
      }
      refetch()
      clearSelection()
    } catch (err) {
      addToast("error", String(err))
    } finally {
      setBulkBusy(false)
    }
  }

  const handleBulkMove = async () => {
    if (selected.size === 0) return
    setBulkBusy(true)
    try {
      const { open } = await import("@tauri-apps/plugin-dialog")
      const dest = await open({ directory: true, multiple: false })
      if (typeof dest !== "string" || dest.length === 0) {
        setBulkBusy(false)
        return
      }
      const result = await bulkMovePlugins(Array.from(selected), dest)
      addToast(result.failed > 0 ? "info" : "success", summarizeBulk(result, "Moved"))
      if (result.errors.length > 0) {
        for (const err of result.errors.slice(0, 3)) addToast("error", err)
      }
      refetch()
      clearSelection()
    } catch (err) {
      addToast("error", String(err))
    } finally {
      setBulkBusy(false)
    }
  }

  const handleAutoOrganize = async () => {
    const ok = window.confirm(
      "This will move all enabled plugins into vendor subfolders under the directory you pick. " +
        "Each move is reversible via Recent Activity. Continue?",
    )
    if (!ok) return
    setOrganizing(true)
    try {
      const { open } = await import("@tauri-apps/plugin-dialog")
      const base = await open({ directory: true, multiple: false })
      if (typeof base !== "string" || base.length === 0) {
        setOrganizing(false)
        return
      }
      const result = await autoOrganizeByVendor(base)
      addToast(result.failed > 0 ? "info" : "success", summarizeBulk(result, "Organized"))
      if (result.errors.length > 0) {
        for (const err of result.errors.slice(0, 3)) addToast("error", err)
      }
      refetch()
    } catch (err) {
      addToast("error", String(err))
    } finally {
      setOrganizing(false)
    }
  }

  const toggleVendorGroup = (vendor: string) => {
    setCollapsedVendors((prev) => {
      const next = new Set(prev)
      if (next.has(vendor)) next.delete(vendor)
      else next.add(vendor)
      return next
    })
  }

  const vendorGroups = useMemo(() => {
    if (!groupByVendor) return null
    const map = new Map<string, Plugin[]>()
    for (const p of plugins) {
      const key = p.vendor ?? "Unknown"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [plugins, groupByVendor])

  const sortArrow = (field: string) => {
    if (sortBy !== field) return ""
    return sortDir === "desc" ? " \u2193" : " \u2191"
  }

  const formatBytes = (bytes: number | null): string => {
    if (!bytes) return "\u2014"
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const allSelected = plugins.length > 0 && selected.size === plugins.length
  const someSelected = selected.size > 0 && !allSelected

  return (
    <div>
      {/* Bulk actions bar — sticky at top when any plugin is selected */}
      {selected.size > 0 && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: spacing.md,
            padding: "10px 16px",
            marginBottom: spacing.md,
            background: colors.surfaceLight,
            border: `1px solid ${colors.primary}`,
            borderRadius: radii.md,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: colors.primary }}>
            {selected.size} selected
          </span>
          <div style={{ width: 1, height: 16, background: colors.border }} />
          <button
            onClick={handleBulkEnable}
            disabled={bulkBusy}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: radii.md,
              border: `1px solid ${colors.success}`,
              background: "transparent",
              color: colors.success,
              fontSize: 12,
              fontWeight: 600,
              cursor: bulkBusy ? "wait" : "pointer",
              opacity: bulkBusy ? 0.5 : 1,
            }}
          >
            <Power size={14} />
            Enable
          </button>
          <button
            onClick={handleBulkDisable}
            disabled={bulkBusy}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: radii.md,
              border: `1px solid ${colors.error}`,
              background: "transparent",
              color: colors.error,
              fontSize: 12,
              fontWeight: 600,
              cursor: bulkBusy ? "wait" : "pointer",
              opacity: bulkBusy ? 0.5 : 1,
            }}
          >
            <PowerOff size={14} />
            Disable
          </button>
          <button
            onClick={handleBulkMove}
            disabled={bulkBusy}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              background: "transparent",
              color: colors.textSecondary,
              fontSize: 12,
              fontWeight: 600,
              cursor: bulkBusy ? "wait" : "pointer",
              opacity: bulkBusy ? 0.5 : 1,
            }}
          >
            <FolderInput size={14} />
            Move to...
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={clearSelection}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              borderRadius: radii.md,
              border: "none",
              background: "transparent",
              color: colors.textSecondary,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <X size={14} />
            Clear
          </button>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Plugins</h1>
        <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
          <span style={{ fontSize: 13, color: colors.mutedStrong }}>
            {plugins.length} plugins
          </span>
          <button
            onClick={() => setGroupByVendor(!groupByVendor)}
            title={groupByVendor ? "Show flat list" : "Group by vendor"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              background: groupByVendor ? "rgba(124,140,250,0.12)" : "transparent",
              color: groupByVendor ? colors.primaryHover : colors.textSecondary,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {groupByVendor ? <Layers size={14} /> : <ListIcon size={14} />}
            {groupByVendor ? "Grouped" : "Group by Vendor"}
          </button>
          <button
            onClick={handleAutoOrganize}
            disabled={organizing || plugins.length === 0}
            title="Move enabled plugins into vendor subfolders"
            style={{
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
              cursor: organizing ? "wait" : "pointer",
              opacity: plugins.length === 0 ? 0.5 : 1,
            }}
          >
            <FolderTree size={14} />
            {organizing ? "Organizing..." : "Auto-Organize"}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || plugins.length === 0}
            style={{
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
              cursor: exporting ? "wait" : "pointer",
              opacity: plugins.length === 0 ? 0.5 : 1,
            }}
          >
            <Download size={14} />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: spacing.lg }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search plugins..."
          style={{
            width: 300,
            height: 36,
            padding: "0 12px",
            background: colors.surfaceLighter,
            border: `1px solid ${colors.border}`,
            borderRadius: radii.md,
            color: colors.text,
            fontSize: 14,
            outline: "none",
          }}
        />
      </div>

      {/* Format filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {ALL_FORMATS.map((fmt) => {
          const isActive = selectedFormat === fmt
          return (
            <button
              key={fmt}
              onClick={() => setSelectedFormat(isActive ? null : fmt)}
              style={{
                padding: "4px 12px",
                borderRadius: radii.full,
                fontSize: 12,
                fontWeight: 600,
                border: isActive ? "none" : `1px solid ${colors.border}`,
                background: isActive ? formatColors[fmt] ?? colors.mutedStrong : "transparent",
                color: isActive ? "#fff" : colors.textSecondary,
                cursor: "pointer",
              }}
            >
              {fmt}
            </button>
          )
        })}
        {selectedFormat && (
          <button
            onClick={() => setSelectedFormat(null)}
            style={{
              padding: "4px 12px",
              borderRadius: radii.full,
              fontSize: 12,
              border: "none",
              background: "transparent",
              color: colors.mutedStrong,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Error */}
      {isError && (
        <div style={{
          padding: 16,
          background: colors.errorBg,
          border: `1px solid ${colors.error}`,
          borderRadius: radii.md,
          color: colors.error,
          marginBottom: 16,
          fontSize: 13,
          fontFamily: "monospace",
          wordBreak: "break-all",
        }}>
          <strong>Error loading plugins:</strong> {String(error)}
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              style={{
                height: 48,
                background: colors.surface,
                borderRadius: radii.md,
                marginBottom: 4,
                animation: "pulseFade 1.4s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      ) : plugins.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: colors.mutedStrong }}>
          <p style={{ fontSize: 18, marginBottom: 8 }}>No plugins found</p>
          <p style={{ fontSize: 14 }}>Try adjusting your filters or run a scan to discover plugins.</p>
        </div>
      ) : groupByVendor && vendorGroups ? (
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
          {vendorGroups.map(([vendor, vendorPlugins]) => {
            const isCollapsed = collapsedVendors.has(vendor)
            return (
              <div
                key={vendor}
                style={{
                  borderRadius: radii.lg,
                  overflow: "hidden",
                  border: `1px solid ${colors.border}`,
                }}
              >
                <button
                  onClick={() => toggleVendorGroup(vendor)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: spacing.md,
                    padding: "12px 16px",
                    background: colors.surface,
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    color: colors.text,
                  }}
                >
                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{vendor}</span>
                  <span style={{ fontSize: 12, color: colors.mutedStrong, marginLeft: "auto" }}>
                    {vendorPlugins.length}
                  </span>
                </button>
                {!isCollapsed && (
                  <PluginTable
                    plugins={vendorPlugins}
                    sortBy={sortBy}
                    sortArrow={sortArrow}
                    onSort={handleSort}
                    onNavigate={(id) => navigate(`/plugins/${id}`)}
                    togglingId={togglingId}
                    onToggle={handleToggle}
                    formatBytes={formatBytes}
                    selected={selected}
                    onToggleOne={toggleOne}
                    onToggleAll={toggleAll}
                    allSelected={allSelected}
                    someSelected={someSelected}
                    hideHeader
                  />
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <PluginTable
          plugins={plugins}
          sortBy={sortBy}
          sortArrow={sortArrow}
          onSort={handleSort}
          onNavigate={(id) => navigate(`/plugins/${id}`)}
          togglingId={togglingId}
          onToggle={handleToggle}
          formatBytes={formatBytes}
          selected={selected}
          onToggleOne={toggleOne}
          onToggleAll={toggleAll}
          allSelected={allSelected}
          someSelected={someSelected}
        />
      )}
    </div>
  )
}

function PluginTable({
  plugins,
  sortArrow,
  onSort,
  onNavigate,
  togglingId,
  onToggle,
  formatBytes,
  selected,
  onToggleOne,
  onToggleAll,
  allSelected,
  someSelected,
  hideHeader,
}: {
  plugins: Plugin[]
  sortBy: string
  sortArrow: (field: string) => string
  onSort: (field: string) => void
  onNavigate: (id: string) => void
  togglingId: string | null
  onToggle: (id: string, enabled: boolean) => void
  formatBytes: (bytes: number | null) => string
  selected: Set<string>
  onToggleOne: (id: string) => void
  onToggleAll: () => void
  allSelected: boolean
  someSelected: boolean
  hideHeader?: boolean
}) {
  const columns = [
    { key: "name", label: "Name" },
    { key: "vendor", label: "Vendor" },
    { key: "format", label: "Format" },
    { key: "category", label: "Category" },
    { key: "file_path", label: "Path" },
    { key: "file_size_bytes", label: "Size" },
    { key: "is_enabled", label: "Status" },
  ]

  return (
    <div
      style={{
        borderRadius: hideHeader ? 0 : radii.lg,
        overflow: "hidden",
        border: hideHeader ? "none" : `1px solid ${colors.border}`,
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        {!hideHeader && (
          <thead>
            <tr style={{ background: colors.surface }}>
              <th
                style={{
                  padding: "12px 16px",
                  width: 40,
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected
                  }}
                  onChange={onToggleAll}
                  aria-label="Select all plugins"
                  style={{ cursor: "pointer" }}
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => onSort(col.key)}
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: 12,
                    fontWeight: 600,
                    color: colors.mutedStrong,
                    cursor: "pointer",
                    userSelect: "none",
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                >
                  {col.label}
                  {sortArrow(col.key)}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {plugins.map((plugin, index) => {
            const isSelected = selected.has(plugin.id)
            return (
            <tr
              key={plugin.id}
              data-clickable="true"
              onClick={() => onNavigate(plugin.id)}
              style={{
                background: isSelected
                  ? "rgba(124,140,250,0.12)"
                  : index % 2 === 0
                    ? "transparent"
                    : "rgba(20,22,31,0.5)",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = colors.surfaceLighter
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = isSelected
                  ? "rgba(124,140,250,0.12)"
                  : index % 2 === 0
                    ? "transparent"
                    : "rgba(20,22,31,0.5)"
              }}
            >
              <td
                style={{
                  padding: "10px 16px",
                  width: 40,
                  borderBottom: `1px solid ${colors.border}`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleOne(plugin.id)}
                  aria-label={`Select ${plugin.name}`}
                  style={{ cursor: "pointer" }}
                />
              </td>
              <td
                style={{
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 500,
                  color: colors.text,
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                {plugin.name}
              </td>
              <td
                style={{
                  padding: "10px 16px",
                  fontSize: 13,
                  color: colors.textSecondary,
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                {plugin.vendor ?? "\u2014"}
              </td>
              <td style={{ padding: "10px 16px", borderBottom: `1px solid ${colors.border}` }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 10px",
                    borderRadius: radii.full,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#fff",
                    background: formatColors[plugin.format] ?? colors.mutedStrong,
                  }}
                >
                  {plugin.format}
                </span>
              </td>
              <td
                style={{
                  padding: "10px 16px",
                  fontSize: 13,
                  color: colors.textSecondary,
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                {plugin.category ?? "Uncategorized"}
              </td>
              <td
                style={{
                  padding: "10px 16px",
                  fontSize: 11,
                  color: colors.muted,
                  borderBottom: `1px solid ${colors.border}`,
                  maxWidth: 250,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontFamily: "monospace",
                }}
                title={plugin.file_path}
              >
                {plugin.file_path}
              </td>
              <td
                style={{
                  padding: "10px 16px",
                  fontSize: 13,
                  color: colors.textSecondary,
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                {formatBytes(plugin.file_size_bytes)}
              </td>
              <td
                style={{
                  padding: "10px 16px",
                  borderBottom: `1px solid ${colors.border}`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => onToggle(plugin.id, plugin.is_enabled)}
                  disabled={togglingId === plugin.id}
                  aria-label={plugin.is_enabled ? "Disable plugin" : "Enable plugin"}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    border: "none",
                    cursor: togglingId === plugin.id ? "wait" : "pointer",
                    background: plugin.is_enabled ? colors.success : colors.surfaceLighter,
                    position: "relative",
                    transition: "background 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      background: "#fff",
                      position: "absolute",
                      top: 3,
                      left: plugin.is_enabled ? 23 : 3,
                      transition: "left 0.2s",
                    }}
                  />
                </button>
              </td>
            </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
