import { invoke } from "@tauri-apps/api/core"
import type {
  Plugin,
  PluginFilter,
  PluginUpdate,
  Collection,
  Tag,
  ScanSummary,
  ScanPath,
  DuplicateGroup,
  AICategorization,
  CleanupSuggestion,
  Settings,
  Stats,
  ToggleHistoryEntry,
} from "./types"

// Scanner
export function scanPlugins(customPaths?: string[]): Promise<ScanSummary> {
  return invoke<ScanSummary>("scan_plugins", { customPaths })
}

export function getScanPaths(): Promise<ScanPath[]> {
  return invoke<ScanPath[]>("get_scan_paths")
}

export function addScanPath(path: string, format?: string): Promise<ScanPath> {
  return invoke<ScanPath>("add_scan_path", { path, format })
}

export function removeScanPath(id: string): Promise<void> {
  return invoke<void>("remove_scan_path", { id })
}

// Plugins
export function getPlugins(filter?: PluginFilter): Promise<Plugin[]> {
  return invoke<Plugin[]>("get_plugins", { filter })
}

export function getPlugin(id: string): Promise<Plugin> {
  return invoke<Plugin>("get_plugin", { id })
}

export function updatePlugin(id: string, update: PluginUpdate): Promise<void> {
  return invoke<void>("update_plugin", { id, update })
}

export function deletePlugin(id: string): Promise<void> {
  return invoke<void>("delete_plugin", { id })
}

// File-system actions on plugins
export function revealInFileManager(path: string): Promise<void> {
  return invoke<void>("reveal_in_file_manager", { path })
}

export function movePlugin(pluginId: string, destination: string): Promise<string> {
  return invoke<string>("move_plugin", { pluginId, destination })
}

export function bulkMovePlugins(
  pluginIds: string[],
  destination: string,
): Promise<BulkResult> {
  return invoke<BulkResult>("bulk_move_plugins", { pluginIds, destination })
}

export function autoOrganizeByVendor(basePath: string): Promise<BulkResult> {
  return invoke<BulkResult>("auto_organize_by_vendor", { basePath })
}

export function deletePluginPermanent(
  pluginId: string,
  deleteFile: boolean,
): Promise<string> {
  return invoke<string>("delete_plugin_permanent", { pluginId, deleteFile })
}

// Stats
export function getStats(): Promise<Stats> {
  return invoke<Stats>("get_stats")
}

// Enable / Disable
export function enablePlugin(pluginId: string): Promise<string> {
  return invoke<string>("enable_plugin", { pluginId })
}

export function disablePlugin(pluginId: string): Promise<string> {
  return invoke<string>("disable_plugin", { pluginId })
}

export function undoLastToggle(): Promise<string> {
  return invoke<string>("undo_last_toggle")
}

// Bulk operations
export interface BulkResult {
  succeeded: number
  failed: number
  errors: string[]
}

export function bulkEnablePlugins(pluginIds: string[]): Promise<BulkResult> {
  return invoke<BulkResult>("bulk_enable_plugins", { pluginIds })
}

export function bulkDisablePlugins(pluginIds: string[]): Promise<BulkResult> {
  return invoke<BulkResult>("bulk_disable_plugins", { pluginIds })
}

export function bulkAddToCollection(
  collectionId: string,
  pluginIds: string[],
): Promise<BulkResult> {
  return invoke<BulkResult>("bulk_add_to_collection", { collectionId, pluginIds })
}

export function getToggleHistory(limit?: number): Promise<ToggleHistoryEntry[]> {
  return invoke<ToggleHistoryEntry[]>("get_toggle_history", { limit })
}

export function undoToggleById(historyId: string): Promise<string> {
  return invoke<string>("undo_toggle_by_id", { historyId })
}

export function exportPluginsToFile(
  destination: string,
  format: "csv" | "markdown",
): Promise<string> {
  return invoke<string>("export_plugins_to_file", { destination, format })
}

// Collections
export function getCollections(): Promise<Collection[]> {
  return invoke<Collection[]>("get_collections")
}

export function createCollection(
  name: string,
  description?: string,
  isSmart?: boolean,
  smartFilter?: string,
): Promise<Collection> {
  return invoke<Collection>("create_collection", {
    name,
    description,
    isSmart,
    smartFilter,
  })
}

export function deleteCollection(id: string): Promise<void> {
  return invoke<void>("delete_collection", { id })
}

export function addToCollection(
  collectionId: string,
  pluginId: string,
): Promise<void> {
  return invoke<void>("add_to_collection", { collectionId, pluginId })
}

export function removeFromCollection(
  collectionId: string,
  pluginId: string,
): Promise<void> {
  return invoke<void>("remove_from_collection", { collectionId, pluginId })
}

// Tags
export function getTags(): Promise<Tag[]> {
  return invoke<Tag[]>("get_tags")
}

export function createTag(name: string, color?: string): Promise<Tag> {
  return invoke<Tag>("create_tag", { name, color })
}

export function deleteTag(id: string): Promise<void> {
  return invoke<void>("delete_tag", { id })
}

export function tagPlugin(pluginId: string, tagId: string): Promise<void> {
  return invoke<void>("tag_plugin", { pluginId, tagId })
}

export function untagPlugin(pluginId: string, tagId: string): Promise<void> {
  return invoke<void>("untag_plugin", { pluginId, tagId })
}

// AI
export function autoCategorize(
  useAi?: boolean,
): Promise<AICategorization[]> {
  return invoke<AICategorization[]>("auto_categorize", { useAi })
}

export function detectDuplicates(): Promise<DuplicateGroup[]> {
  return invoke<DuplicateGroup[]>("detect_duplicates")
}

export function suggestCleanup(): Promise<CleanupSuggestion[]> {
  return invoke<CleanupSuggestion[]>("suggest_cleanup")
}

// Settings
export function getSettings(): Promise<Settings> {
  return invoke<Settings>("get_settings")
}

export function updateSettings(
  settings: Record<string, string>,
): Promise<void> {
  return invoke<void>("update_settings", { settings })
}
