import { create } from "zustand"
import type { ScanProgressEvent } from "../lib/types"

interface Toast {
  id: string
  type: "success" | "error" | "info"
  message: string
}

interface AppState {
  // Selection
  selectedPluginIds: string[]
  setSelectedPlugins: (ids: string[]) => void
  togglePluginSelection: (id: string) => void
  clearSelection: () => void

  // View
  viewMode: "table" | "grid"
  toggleViewMode: () => void
  setViewMode: (mode: "table" | "grid") => void

  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  // Scan
  scanInProgress: boolean
  setScanInProgress: (v: boolean) => void
  scanProgress: ScanProgressEvent | null
  setScanProgress: (p: ScanProgressEvent | null) => void

  // Global search
  globalSearch: string
  setGlobalSearch: (s: string) => void

  // Toasts
  toasts: Toast[]
  addToast: (type: Toast["type"], message: string) => void
  removeToast: (id: string) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Selection
  selectedPluginIds: [],
  setSelectedPlugins: (ids) => set({ selectedPluginIds: ids }),
  togglePluginSelection: (id) =>
    set((s) => ({
      selectedPluginIds: s.selectedPluginIds.includes(id)
        ? s.selectedPluginIds.filter((i) => i !== id)
        : [...s.selectedPluginIds, id],
    })),
  clearSelection: () => set({ selectedPluginIds: [] }),

  // View
  viewMode: "table",
  toggleViewMode: () =>
    set((s) => ({ viewMode: s.viewMode === "table" ? "grid" : "table" })),
  setViewMode: (mode) => set({ viewMode: mode }),

  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // Scan
  scanInProgress: false,
  setScanInProgress: (v) => set({ scanInProgress: v }),
  scanProgress: null,
  setScanProgress: (p) => set({ scanProgress: p }),

  // Global search
  globalSearch: "",
  setGlobalSearch: (s) => set({ globalSearch: s }),

  // Toasts
  toasts: [],
  addToast: (type, message) => {
    const id = `${Date.now()}-${Math.random()}`
    set((s) => ({
      toasts: [...s.toasts, { id, type, message }],
    }))
    setTimeout(() => {
      get().removeToast(id)
    }, 4500)
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
