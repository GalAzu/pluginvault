use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// --- Plugin ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Plugin {
    pub id: String,
    pub name: String,
    pub vendor: Option<String>,
    pub version: Option<String>,
    pub format: String,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub file_path: String,
    pub file_size_bytes: Option<i64>,
    pub architecture: Option<String>,
    pub is_enabled: bool,
    pub original_path: Option<String>,
    pub disabled_path: Option<String>,
    pub hash: Option<String>,
    pub install_date: Option<String>,
    pub last_scanned: Option<String>,
    pub first_seen: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewPlugin {
    pub name: String,
    pub vendor: Option<String>,
    pub version: Option<String>,
    pub format: String,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub file_path: String,
    pub file_size_bytes: Option<i64>,
    pub architecture: Option<String>,
    pub hash: Option<String>,
    pub install_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PluginUpdate {
    pub name: Option<String>,
    pub vendor: Option<String>,
    pub version: Option<String>,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub is_enabled: Option<bool>,
    pub file_path: Option<String>,
    pub original_path: Option<String>,
    pub disabled_path: Option<String>,
    pub notes: Option<String>,
    /// If true, sets disabled_path to NULL regardless of the `disabled_path` field above.
    /// Used when re-enabling a plugin to clear the stored disabled location.
    #[serde(default)]
    pub clear_disabled_path: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PluginFilter {
    pub search: Option<String>,
    pub format: Option<String>,
    pub category: Option<String>,
    pub vendor: Option<String>,
    pub is_enabled: Option<bool>,
    pub collection_id: Option<String>,
    pub tag_id: Option<String>,
    pub sort_by: Option<String>,
    pub sort_dir: Option<String>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

// --- Tags ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub created_at: String,
    pub plugin_count: Option<i64>,
}

// --- Collections ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub is_smart: bool,
    pub smart_filter: Option<String>,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
    pub plugin_count: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewCollection {
    pub name: String,
    pub description: Option<String>,
    pub is_smart: Option<bool>,
    pub smart_filter: Option<String>,
}

// --- Toggle History ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToggleHistoryEntry {
    pub id: String,
    pub plugin_id: String,
    pub action: String,
    pub original_path: String,
    pub target_path: String,
    pub method: String,
    pub performed_at: String,
    pub undone: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToggleHistoryWithPlugin {
    pub id: String,
    pub plugin_id: String,
    pub plugin_name: String,
    pub action: String,
    pub original_path: String,
    pub target_path: String,
    pub method: String,
    pub performed_at: String,
    pub undone: bool,
}

// --- Scan ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanPath {
    pub id: String,
    pub path: String,
    pub format: Option<String>,
    pub is_default: bool,
    pub is_enabled: bool,
    pub added_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanPathConfig {
    pub path: String,
    pub format: String,
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanProgress {
    pub current_path: String,
    pub plugins_found: u32,
    pub directories_scanned: u32,
    pub phase: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanSummary {
    pub total_found: u32,
    pub new_plugins: u32,
    pub updated_plugins: u32,
    pub scan_duration_ms: u64,
    pub paths_scanned: Vec<String>,
    pub errors: Vec<String>,
}

// --- Settings ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub disabled_folder: String,
    pub toggle_method: String,
    pub theme: String,
    pub auto_scan_on_launch: bool,
    pub ai_provider: String,
    pub ai_model: String,
    pub ai_api_key: String,
}

// --- Stats ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stats {
    pub total: u32,
    pub enabled: u32,
    pub disabled: u32,
    pub by_format: HashMap<String, u32>,
    pub by_category: HashMap<String, u32>,
    pub by_vendor: HashMap<String, u32>,
}

// --- AI ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateGroup {
    pub reason: String,
    pub members: Vec<DuplicateMember>,
    pub recommendation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateMember {
    pub id: String,
    pub name: String,
    pub vendor: Option<String>,
    pub version: Option<String>,
    pub format: String,
    pub file_path: String,
    pub file_size_bytes: Option<i64>,
    pub hash: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AICategorization {
    pub plugin_id: String,
    pub category: String,
    pub subcategory: Option<String>,
    pub confidence: f32,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategorySuggestion {
    pub name: String,
    pub category: String,
    pub subcategory: Option<String>,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanupSuggestion {
    pub plugin_id: String,
    pub plugin_name: String,
    pub reason: String,
    pub suggestion_type: String,
    pub severity: String,
    pub related_plugin_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginSummary {
    pub name: String,
    pub vendor: Option<String>,
    pub format: String,
}

// --- Scanner internal types ---

#[derive(Debug, Clone)]
pub struct DiscoveredPlugin {
    pub path: std::path::PathBuf,
    pub format: String,
}

#[derive(Debug, Clone)]
pub struct PluginMetadata {
    pub name: String,
    pub vendor: Option<String>,
    pub version: Option<String>,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub file_size_bytes: i64,
    pub architecture: Option<String>,
    pub hash: String,
    pub install_date: Option<String>,
}

// --- Toggle result ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToggleResult {
    pub success: bool,
    pub original_path: String,
    pub target_path: String,
    pub method: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UpsertResult {
    Inserted,
    Updated,
}

// --- Bulk operations ---

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct BulkResult {
    pub succeeded: u32,
    pub failed: u32,
    pub errors: Vec<String>,
}
