import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getPlugin,
  updatePlugin,
  enablePlugin,
  disablePlugin,
  revealInFileManager,
  movePlugin,
  deletePluginPermanent,
} from "../lib/tauri"
import { useAppStore } from "../stores/appStore"
import type { PluginUpdate } from "../lib/types"
import { colors, formatColors, radii, spacing } from "../styles/tokens"

export function PluginDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const addToast = useAppStore((s) => s.addToast)

  const [notes, setNotes] = useState<string | null>(null)
  const [savingNotes, setSavingNotes] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [moving, setMoving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteFileToo, setDeleteFileToo] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { data: plugin, isLoading } = useQuery({
    queryKey: ["plugin", id],
    queryFn: () => getPlugin(id!),
    enabled: !!id,
  })

  const displayNotes = notes ?? plugin?.notes ?? ""

  const handleSaveNotes = async () => {
    if (!plugin) return
    setSavingNotes(true)
    try {
      const update: PluginUpdate = { notes: displayNotes || undefined }
      await updatePlugin(plugin.id, update)
      queryClient.invalidateQueries({ queryKey: ["plugin", id] })
      addToast("success", "Notes saved")
    } catch (err) {
      addToast("error", String(err))
    } finally {
      setSavingNotes(false)
    }
  }

  const handleReveal = async () => {
    if (!plugin) return
    try {
      await revealInFileManager(plugin.file_path)
    } catch (err) {
      addToast("error", String(err))
    }
  }

  const handleMove = async () => {
    if (!plugin) return
    setMoving(true)
    try {
      const { open } = await import("@tauri-apps/plugin-dialog")
      const dest = await open({ directory: true, multiple: false })
      if (typeof dest === "string" && dest.length > 0) {
        const message = await movePlugin(plugin.id, dest)
        addToast("success", message)
        queryClient.invalidateQueries({ queryKey: ["plugin", id] })
        queryClient.invalidateQueries({ queryKey: ["plugins"] })
      }
    } catch (err) {
      addToast("error", String(err))
    } finally {
      setMoving(false)
    }
  }

  const handleDelete = async () => {
    if (!plugin) return
    setDeleting(true)
    try {
      const message = await deletePluginPermanent(plugin.id, deleteFileToo)
      addToast("success", message)
      queryClient.invalidateQueries({ queryKey: ["plugins"] })
      queryClient.invalidateQueries({ queryKey: ["stats"] })
      setShowDeleteModal(false)
      navigate("/plugins")
    } catch (err) {
      addToast("error", String(err))
    } finally {
      setDeleting(false)
    }
  }

  const handleToggle = async () => {
    if (!plugin) return
    setToggling(true)
    try {
      const message = plugin.is_enabled
        ? await disablePlugin(plugin.id)
        : await enablePlugin(plugin.id)
      addToast("success", message)
      queryClient.invalidateQueries({ queryKey: ["plugin", id] })
      queryClient.invalidateQueries({ queryKey: ["plugins"] })
      queryClient.invalidateQueries({ queryKey: ["stats"] })
    } catch (err) {
      addToast("error", String(err))
    } finally {
      setToggling(false)
    }
  }

  const formatBytes = (bytes: number | null): string => {
    if (!bytes) return "\u2014"
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const formatDate = (date: string | null | undefined): string => {
    if (!date) return "\u2014"
    try {
      return new Date(date).toLocaleDateString("en-GB")
    } catch {
      return "\u2014"
    }
  }

  if (isLoading || !plugin) {
    return (
      <div>
        <div
          style={{
            height: 32,
            width: 200,
            background: colors.surface,
            borderRadius: radii.md,
            marginBottom: spacing.lg,
            animation: "pulseFade 1.4s ease-in-out infinite",
          }}
        />
        <div
          style={{
            height: 300,
            background: colors.surface,
            borderRadius: radii.lg,
            animation: "pulseFade 1.4s ease-in-out infinite",
          }}
        />
      </div>
    )
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
    marginBottom: 4,
  }

  const valueStyle: React.CSSProperties = {
    fontSize: 14,
    color: colors.textSecondary,
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: spacing.lg, marginBottom: spacing.xl }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 36,
            height: 36,
            borderRadius: radii.md,
            border: `1px solid ${colors.border}`,
            background: "transparent",
            color: colors.textSecondary,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
          aria-label="Back"
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text }}>{plugin.name}</h1>
          {plugin.vendor && (
            <p style={{ fontSize: 14, color: colors.mutedStrong, marginTop: 2 }}>{plugin.vendor}</p>
          )}
        </div>
        <button
          onClick={handleMove}
          disabled={moving}
          style={{
            padding: "8px 14px",
            borderRadius: radii.md,
            border: `1px solid ${colors.border}`,
            background: "transparent",
            color: colors.textSecondary,
            fontSize: 12,
            fontWeight: 500,
            cursor: moving ? "wait" : "pointer",
            opacity: moving ? 0.5 : 1,
          }}
        >
          {moving ? "Moving..." : "Move to..."}
        </button>
        <button
          onClick={handleToggle}
          disabled={toggling}
          aria-label={plugin.is_enabled ? "Disable plugin" : "Enable plugin"}
          style={{
            width: 48,
            height: 26,
            borderRadius: 13,
            border: "none",
            cursor: toggling ? "wait" : "pointer",
            background: plugin.is_enabled ? colors.success : colors.surfaceLighter,
            position: "relative",
            transition: "background 0.2s",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              background: "#fff",
              position: "absolute",
              top: 3,
              left: plugin.is_enabled ? 25 : 3,
              transition: "left 0.2s",
            }}
          />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        {/* Left column */}
        <div>
          <div style={cardStyle}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: spacing.lg, color: colors.text }}>
              Details
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.lg }}>
              <div>
                <div style={labelStyle}>Format</div>
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
              </div>
              <div>
                <div style={labelStyle}>Category</div>
                <div style={valueStyle}>{plugin.category ?? "Uncategorized"}</div>
              </div>
              <div>
                <div style={labelStyle}>Subcategory</div>
                <div style={valueStyle}>{plugin.subcategory ?? "\u2014"}</div>
              </div>
              <div>
                <div style={labelStyle}>Version</div>
                <div style={valueStyle}>{plugin.version ?? "\u2014"}</div>
              </div>
              <div>
                <div style={labelStyle}>Size</div>
                <div style={valueStyle}>{formatBytes(plugin.file_size_bytes)}</div>
              </div>
              <div>
                <div style={labelStyle}>Architecture</div>
                <div style={valueStyle}>{plugin.architecture ?? "\u2014"}</div>
              </div>
              <div>
                <div style={labelStyle}>Install Date</div>
                <div style={valueStyle}>{formatDate(plugin.install_date)}</div>
              </div>
              <div>
                <div style={labelStyle}>First Seen</div>
                <div style={valueStyle}>{formatDate(plugin.first_seen)}</div>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: spacing.md,
              }}
            >
              <h2 style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
                File Location
              </h2>
              <button
                onClick={handleReveal}
                style={{
                  padding: "5px 10px",
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  background: "transparent",
                  color: colors.textSecondary,
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Reveal in Finder
              </button>
            </div>
            <div
              style={{
                background: colors.surfaceLighter,
                borderRadius: radii.md,
                padding: "10px 14px",
                fontSize: 12,
                color: colors.textSecondary,
                fontFamily: "monospace",
                wordBreak: "break-all",
              }}
            >
              {plugin.file_path}
            </div>
            {plugin.hash && (
              <p style={{ fontSize: 11, color: colors.mutedStrong, marginTop: 8 }}>
                Hash: {plugin.hash.slice(0, 16)}...
              </p>
            )}
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: spacing.md, color: colors.text }}>
              Notes
            </h2>
            <textarea
              value={displayNotes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this plugin..."
              rows={4}
              style={{
                width: "100%",
                resize: "none",
                background: colors.surfaceLighter,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                padding: "10px 14px",
                fontSize: 14,
                color: colors.text,
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                style={{
                  padding: "8px 16px",
                  background: colors.primary,
                  color: "#fff",
                  border: "none",
                  borderRadius: radii.md,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: savingNotes ? "wait" : "pointer",
                  opacity: savingNotes ? 0.5 : 1,
                }}
              >
                {savingNotes ? "Saving..." : "Save Notes"}
              </button>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div>
          <div style={cardStyle}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: spacing.md, color: colors.text }}>
              Status
            </h2>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 500,
                background: plugin.is_enabled ? colors.successBg : colors.errorBg,
                color: plugin.is_enabled ? colors.success : colors.error,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: plugin.is_enabled ? colors.success : colors.error,
                }}
              />
              {plugin.is_enabled ? "Enabled" : "Disabled"}
            </div>
            {plugin.disabled_path && (
              <p style={{ fontSize: 12, color: colors.mutedStrong, marginTop: 8, wordBreak: "break-all" }}>
                Disabled at: {plugin.disabled_path}
              </p>
            )}
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: colors.text }}>
              Last Scanned
            </h2>
            <p style={{ fontSize: 14, color: colors.textSecondary }}>{formatDate(plugin.last_scanned)}</p>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: colors.text }}>Timestamps</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: colors.mutedStrong }}>Created</span>
                <span style={{ fontSize: 12, color: colors.textSecondary }}>
                  {formatDate(plugin.created_at)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: colors.mutedStrong }}>Updated</span>
                <span style={{ fontSize: 12, color: colors.textSecondary }}>
                  {formatDate(plugin.updated_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div
        style={{
          marginTop: spacing.xl,
          paddingTop: spacing.lg,
          borderTop: `1px solid ${colors.border}`,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={() => {
            setDeleteFileToo(false)
            setShowDeleteModal(true)
          }}
          style={{
            padding: "8px 16px",
            background: "transparent",
            color: colors.error,
            border: `1px solid ${colors.error}`,
            borderRadius: radii.md,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Delete...
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.surface,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border}`,
              padding: 24,
              width: 460,
              maxWidth: "92vw",
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Delete plugin
            </h2>
            <p
              style={{
                fontSize: 13,
                color: colors.textSecondary,
                marginBottom: spacing.lg,
              }}
            >
              You are about to delete <strong>{plugin.name}</strong>. Choose how:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: spacing.lg }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: 12,
                  border: `1px solid ${deleteFileToo ? colors.border : colors.primary}`,
                  borderRadius: radii.md,
                  cursor: "pointer",
                  background: deleteFileToo ? "transparent" : "rgba(124,140,250,0.08)",
                }}
              >
                <input
                  type="radio"
                  name="delete-mode"
                  checked={!deleteFileToo}
                  onChange={() => setDeleteFileToo(false)}
                  style={{ marginTop: 2 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                    Remove from database only
                  </div>
                  <div style={{ fontSize: 12, color: colors.mutedStrong, marginTop: 2 }}>
                    The plugin file stays on disk and will reappear on the next scan.
                  </div>
                </div>
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: 12,
                  border: `1px solid ${deleteFileToo ? colors.error : colors.border}`,
                  borderRadius: radii.md,
                  cursor: "pointer",
                  background: deleteFileToo ? "rgba(239,68,68,0.08)" : "transparent",
                }}
              >
                <input
                  type="radio"
                  name="delete-mode"
                  checked={deleteFileToo}
                  onChange={() => setDeleteFileToo(true)}
                  style={{ marginTop: 2 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.error }}>
                    Delete file and database entry
                  </div>
                  <div style={{ fontSize: 12, color: colors.mutedStrong, marginTop: 2 }}>
                    Permanently removes the plugin file from disk. This cannot be undone.
                  </div>
                </div>
              </label>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  color: colors.textSecondary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.md,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: deleting ? "wait" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: "8px 16px",
                  background: colors.error,
                  color: "#fff",
                  border: "none",
                  borderRadius: radii.md,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: deleting ? "wait" : "pointer",
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? "Deleting..." : "Confirm delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
