import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import {
  getCollections,
  createCollection,
  deleteCollection,
  getPlugins,
  addToCollection,
  removeFromCollection,
} from "../lib/tauri"
import { useAppStore } from "../stores/appStore"
import type { Collection, Plugin } from "../lib/types"
import { colors, radii, spacing } from "../styles/tokens"

export function Collections() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const addToast = useAppStore((s) => s.addToast)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showAddPlugins, setShowAddPlugins] = useState(false)
  const [addingPluginId, setAddingPluginId] = useState<string | null>(null)
  const [removingPluginId, setRemovingPluginId] = useState<string | null>(null)

  const { data: collections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: getCollections,
  })

  const { data: plugins = [] } = useQuery({
    queryKey: ["plugins", { collection_id: selectedId }],
    queryFn: () => getPlugins({ collection_id: selectedId! }),
    enabled: !!selectedId,
  })

  const { data: allPlugins = [] } = useQuery({
    queryKey: ["plugins", {}],
    queryFn: () => getPlugins({}),
    enabled: showAddPlugins,
  })

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      await createCollection(newName.trim(), newDesc.trim() || undefined)
      queryClient.invalidateQueries({ queryKey: ["collections"] })
      setShowCreate(false)
      setNewName("")
      setNewDesc("")
      addToast("success", `Collection "${newName.trim()}" created`)
    } catch (err) {
      addToast("error", String(err))
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const col = collections.find((c: Collection) => c.id === id)
      await deleteCollection(id)
      if (selectedId === id) setSelectedId(null)
      queryClient.invalidateQueries({ queryKey: ["collections"] })
      addToast("success", `Collection "${col?.name ?? ""}" deleted`)
    } catch (err) {
      addToast("error", String(err))
    }
    setShowDeleteConfirm(null)
  }

  const handleAddPlugin = async (pluginId: string) => {
    if (!selectedId) return
    setAddingPluginId(pluginId)
    try {
      await addToCollection(selectedId, pluginId)
      queryClient.invalidateQueries({ queryKey: ["plugins", { collection_id: selectedId }] })
      queryClient.invalidateQueries({ queryKey: ["collections"] })
      addToast("success", "Plugin added to collection")
    } catch (err) {
      addToast("error", String(err))
    } finally {
      setAddingPluginId(null)
    }
  }

  const handleRemovePlugin = async (pluginId: string) => {
    if (!selectedId) return
    setRemovingPluginId(pluginId)
    try {
      await removeFromCollection(selectedId, pluginId)
      queryClient.invalidateQueries({ queryKey: ["plugins", { collection_id: selectedId }] })
      queryClient.invalidateQueries({ queryKey: ["collections"] })
      addToast("info", "Plugin removed from collection")
    } catch (err) {
      addToast("error", String(err))
    } finally {
      setRemovingPluginId(null)
    }
  }

  const selectedCollection = collections.find((c: Collection) => c.id === selectedId)
  const collectionPluginIds = new Set(plugins.map((p: Plugin) => p.id))

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

  const modalOverlayStyle: React.CSSProperties = {
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
  }

  const modalBodyStyle: React.CSSProperties = {
    background: colors.surface,
    borderRadius: radii.lg,
    border: `1px solid ${colors.border}`,
    padding: spacing.xl,
  }

  const cancelBtn: React.CSSProperties = {
    padding: "8px 16px",
    borderRadius: radii.md,
    border: `1px solid ${colors.border}`,
    background: "transparent",
    color: colors.textSecondary,
    fontSize: 13,
    cursor: "pointer",
  }

  return (
    <div style={{ display: "flex", gap: spacing.xl, height: "100%" }}>
      {/* Left sidebar */}
      <div style={{ width: 260, flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: spacing.lg,
          }}
        >
          <h1 style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>Collections</h1>
          <button
            onClick={() => setShowCreate(true)}
            aria-label="New collection"
            style={{
              width: 28,
              height: 28,
              borderRadius: radii.md,
              border: "none",
              background: "transparent",
              color: colors.mutedStrong,
              cursor: "pointer",
              fontSize: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            +
          </button>
        </div>

        {collections.length === 0 ? (
          <p style={{ fontSize: 13, color: colors.mutedStrong }}>No collections yet</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {collections.map((col: Collection) => (
              <div
                key={col.id}
                onClick={() => setSelectedId(col.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: radii.md,
                  cursor: "pointer",
                  background: selectedId === col.id ? "rgba(124,140,250,0.15)" : "transparent",
                  color: selectedId === col.id ? colors.primaryHover : colors.text,
                  transition: "background 0.15s",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{col.name}</div>
                  <div style={{ fontSize: 11, color: colors.mutedStrong, marginTop: 2 }}>
                    {col.plugin_count ?? 0} plugins
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDeleteConfirm(col.id)
                  }}
                  aria-label={`Delete ${col.name}`}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: colors.mutedStrong,
                    cursor: "pointer",
                    fontSize: 14,
                    padding: "2px 6px",
                    borderRadius: 4,
                    opacity: 0.6,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right content */}
      <div style={{ flex: 1 }}>
        {selectedId && selectedCollection ? (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: spacing.lg,
              }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 600, color: colors.text }}>
                {selectedCollection.name}
              </h2>
              <button
                onClick={() => setShowAddPlugins(true)}
                style={{
                  padding: "7px 16px",
                  borderRadius: radii.md,
                  border: "none",
                  background: colors.primary,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Add Plugins
              </button>
            </div>
            {selectedCollection.description && (
              <p style={{ fontSize: 13, color: colors.textSecondary, marginBottom: spacing.lg }}>
                {selectedCollection.description}
              </p>
            )}
            {selectedCollection.is_smart && selectedCollection.smart_filter && (
              <div
                style={{
                  fontSize: 12,
                  color: colors.accent,
                  marginBottom: spacing.lg,
                  padding: "6px 12px",
                  background: "rgba(34,211,238,0.1)",
                  borderRadius: radii.md,
                  display: "inline-block",
                }}
              >
                Smart Collection
              </div>
            )}
            {plugins.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: colors.mutedStrong }}>
                <p style={{ fontSize: 18, marginBottom: 8 }}>Empty collection</p>
                <p style={{ fontSize: 14 }}>Click "Add Plugins" to add plugins to this collection.</p>
              </div>
            ) : (
              <div
                style={{
                  borderRadius: radii.lg,
                  overflow: "hidden",
                  border: `1px solid ${colors.border}`,
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: colors.surface }}>
                      {["Name", "Format", "Category", "Status", ""].map((label, i) => (
                        <th
                          key={i}
                          style={{
                            padding: "10px 16px",
                            textAlign: "left",
                            fontSize: 12,
                            fontWeight: 600,
                            color: colors.mutedStrong,
                            borderBottom: `1px solid ${colors.border}`,
                            width: i === 4 ? 50 : undefined,
                          }}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {plugins.map((p: Plugin) => (
                      <tr
                        key={p.id}
                        data-clickable="true"
                        onClick={() => navigate(`/plugins/${p.id}`)}
                        style={{ cursor: "pointer" }}
                        onMouseEnter={(e) => {
                          ;(e.currentTarget as HTMLElement).style.background = colors.surfaceLighter
                        }}
                        onMouseLeave={(e) => {
                          ;(e.currentTarget as HTMLElement).style.background = "transparent"
                        }}
                      >
                        <td
                          style={{
                            padding: "10px 16px",
                            fontSize: 14,
                            fontWeight: 500,
                            color: colors.text,
                            borderBottom: `1px solid ${colors.border}`,
                          }}
                        >
                          {p.name}
                        </td>
                        <td
                          style={{
                            padding: "10px 16px",
                            fontSize: 13,
                            color: colors.textSecondary,
                            borderBottom: `1px solid ${colors.border}`,
                          }}
                        >
                          {p.format}
                        </td>
                        <td
                          style={{
                            padding: "10px 16px",
                            fontSize: 13,
                            color: colors.textSecondary,
                            borderBottom: `1px solid ${colors.border}`,
                          }}
                        >
                          {p.category ?? "\u2014"}
                        </td>
                        <td
                          style={{
                            padding: "10px 16px",
                            fontSize: 13,
                            borderBottom: `1px solid ${colors.border}`,
                          }}
                        >
                          <span style={{ color: p.is_enabled ? colors.success : colors.error }}>
                            {p.is_enabled ? "Enabled" : "Disabled"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "10px 16px",
                            borderBottom: `1px solid ${colors.border}`,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleRemovePlugin(p.id)}
                            disabled={removingPluginId === p.id}
                            aria-label="Remove from collection"
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: radii.sm,
                              border: `1px solid ${colors.border}`,
                              background: "transparent",
                              color: colors.mutedStrong,
                              cursor: removingPluginId === p.id ? "wait" : "pointer",
                              fontSize: 14,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              opacity: removingPluginId === p.id ? 0.4 : 1,
                            }}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "80px 0", color: colors.mutedStrong }}>
            <p style={{ fontSize: 18, marginBottom: 8 }}>Select a collection</p>
            <p style={{ fontSize: 14, marginBottom: 20 }}>
              Choose a collection from the sidebar to view its plugins.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                padding: "10px 20px",
                background: colors.primary,
                color: "#fff",
                border: "none",
                borderRadius: radii.md,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Create Collection
            </button>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div style={modalOverlayStyle} onClick={() => setShowCreate(false)}>
          <div
            style={{ ...modalBodyStyle, width: 400, maxWidth: "90%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: colors.text }}>
              New Collection
            </h3>
            <div style={{ marginBottom: spacing.lg }}>
              <label
                style={{
                  fontSize: 12,
                  color: colors.mutedStrong,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Collection name"
                style={inputStyle}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  fontSize: 12,
                  color: colors.mutedStrong,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Description (optional)
              </label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What's this collection for?"
                style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setShowCreate(false)} style={cancelBtn}>
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                style={{
                  padding: "8px 16px",
                  borderRadius: radii.md,
                  border: "none",
                  background: !newName.trim() ? colors.surfaceLighter : colors.primary,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: !newName.trim() ? "default" : "pointer",
                  opacity: !newName.trim() ? 0.5 : 1,
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div style={modalOverlayStyle} onClick={() => setShowDeleteConfirm(null)}>
          <div
            style={{ ...modalBodyStyle, width: 380, maxWidth: "90%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: colors.text }}>
              Delete Collection
            </h3>
            <p style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 20 }}>
              Are you sure? Plugins in this collection will not be deleted.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setShowDeleteConfirm(null)} style={cancelBtn}>
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                style={{
                  padding: "8px 16px",
                  borderRadius: radii.md,
                  border: "none",
                  background: colors.error,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Plugins modal */}
      {showAddPlugins && selectedId && (
        <div style={modalOverlayStyle} onClick={() => setShowAddPlugins(false)}>
          <div
            style={{
              ...modalBodyStyle,
              width: 500,
              maxWidth: "90%",
              maxHeight: "70vh",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: spacing.lg, color: colors.text }}>
              Add Plugins to Collection
            </h3>
            <div style={{ flex: 1, overflow: "auto" }}>
              {allPlugins.length === 0 ? (
                <p
                  style={{
                    fontSize: 13,
                    color: colors.mutedStrong,
                    textAlign: "center",
                    padding: "20px 0",
                  }}
                >
                  No plugins available. Run a scan first.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {allPlugins.map((p: Plugin) => {
                    const alreadyIn = collectionPluginIds.has(p.id)
                    const isAdding = addingPluginId === p.id
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "8px 12px",
                          borderRadius: radii.md,
                          background: alreadyIn ? "rgba(124,140,250,0.08)" : "transparent",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: 11, color: colors.mutedStrong }}>
                            {p.vendor ?? "Unknown"} — {p.format}
                          </div>
                        </div>
                        {alreadyIn ? (
                          <span
                            style={{
                              fontSize: 11,
                              color: colors.success,
                              padding: "3px 10px",
                              borderRadius: radii.md,
                              background: colors.successBg,
                            }}
                          >
                            Added
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAddPlugin(p.id)}
                            disabled={isAdding}
                            style={{
                              padding: "4px 12px",
                              borderRadius: radii.sm,
                              border: `1px solid ${colors.border}`,
                              background: "transparent",
                              color: colors.textSecondary,
                              fontSize: 12,
                              cursor: isAdding ? "wait" : "pointer",
                              opacity: isAdding ? 0.5 : 1,
                            }}
                          >
                            {isAdding ? "..." : "Add"}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: spacing.lg }}>
              <button onClick={() => setShowAddPlugins(false)} style={cancelBtn}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
