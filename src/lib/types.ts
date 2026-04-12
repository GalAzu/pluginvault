// Types matching the exact Rust backend structs

export interface Plugin {
  id: string
  name: string
  vendor: string | null
  version: string | null
  format: string
  category: string | null
  subcategory: string | null
  file_path: string
  file_size_bytes: number | null
  architecture: string | null
  is_enabled: boolean
  original_path: string | null
  disabled_path: string | null
  hash: string | null
  install_date: string | null
  last_scanned: string | null
  first_seen: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PluginFilter {
  search?: string
  format?: string
  category?: string
  vendor?: string
  is_enabled?: boolean
  collection_id?: string
  tag_id?: string
  sort_by?: string
  sort_dir?: string // "asc" | "desc"
  limit?: number
  offset?: number
}

export interface PluginUpdate {
  name?: string
  vendor?: string
  version?: string
  category?: string
  subcategory?: string
  is_enabled?: boolean
  original_path?: string
  disabled_path?: string
  notes?: string
}

export interface Tag {
  id: string
  name: string
  color: string | null
  created_at: string
  plugin_count: number | null
}

export interface Collection {
  id: string
  name: string
  description: string | null
  is_smart: boolean
  smart_filter: string | null
  sort_order: number
  created_at: string
  updated_at: string
  plugin_count: number | null
}

export interface ScanPath {
  id: string
  path: string
  format: string | null
  is_default: boolean
  is_enabled: boolean
  added_at: string
}

export interface ScanSummary {
  total_found: number
  new_plugins: number
  updated_plugins: number
  scan_duration_ms: number
  paths_scanned: string[]
  errors: string[]
}

export interface Stats {
  total: number
  enabled: number
  disabled: number
  by_format: Record<string, number>
  by_category: Record<string, number>
  by_vendor: Record<string, number>
}

export interface DuplicateGroup {
  reason: string
  members: DuplicateMember[]
  recommendation: string
}

export interface DuplicateMember {
  id: string
  name: string
  vendor: string | null
  version: string | null
  format: string
  file_path: string
  file_size_bytes: number | null
  hash: string | null
}

export interface AICategorization {
  plugin_id: string
  category: string
  subcategory: string | null
  confidence: number
  source: string
}

export interface CleanupSuggestion {
  plugin_id: string
  plugin_name: string
  reason: string
  suggestion_type: string
  severity: string
  related_plugin_id: string | null
}

export interface Settings {
  disabled_folder: string
  toggle_method: string
  theme: string
  auto_scan_on_launch: boolean
  ai_provider: string
  ai_model: string
  ai_api_key: string
}

export interface ScanProgressEvent {
  phase: string // "starting" | "walking" | "hashing" | "saving" | "done"
  current_path: string
  plugins_found: number
  directories_scanned: number
}

export interface ToggleHistoryEntry {
  id: string
  plugin_id: string
  plugin_name: string
  action: string
  original_path: string
  target_path: string
  method: string
  performed_at: string
  undone: boolean
}
