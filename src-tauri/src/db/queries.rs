use rusqlite::{params, Connection, OptionalExtension};
use std::collections::HashMap;

use super::models::*;
use crate::utils::errors::AppError;

// --- Plugins ---

pub fn upsert_plugin(conn: &Connection, plugin: &NewPlugin) -> Result<UpsertResult, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Check if plugin already exists at this path
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM plugins WHERE file_path = ?1",
            params![plugin.file_path],
            |row| row.get(0),
        )
        .optional()?;

    match existing {
        Some(existing_id) => {
            conn.execute(
                "UPDATE plugins SET name = ?1, vendor = ?2, version = ?3, format = ?4,
                 category = COALESCE(?5, category), subcategory = COALESCE(?6, subcategory),
                 file_size_bytes = ?7, architecture = ?8, hash = ?9,
                 last_scanned = ?10, updated_at = ?10
                 WHERE id = ?11",
                params![
                    plugin.name,
                    plugin.vendor,
                    plugin.version,
                    plugin.format,
                    plugin.category,
                    plugin.subcategory,
                    plugin.file_size_bytes,
                    plugin.architecture,
                    plugin.hash,
                    now,
                    existing_id,
                ],
            )?;
            Ok(UpsertResult::Updated)
        }
        None => {
            conn.execute(
                "INSERT INTO plugins (id, name, vendor, version, format, category, subcategory,
                 file_path, file_size_bytes, architecture, is_enabled, hash, install_date,
                 last_scanned, first_seen, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 1, ?11, ?12, ?13, ?13, ?13, ?13)",
                params![
                    id,
                    plugin.name,
                    plugin.vendor,
                    plugin.version,
                    plugin.format,
                    plugin.category,
                    plugin.subcategory,
                    plugin.file_path,
                    plugin.file_size_bytes,
                    plugin.architecture,
                    plugin.hash,
                    plugin.install_date,
                    now,
                ],
            )?;
            Ok(UpsertResult::Inserted)
        }
    }
}

pub fn get_all_plugins(conn: &Connection, filter: &PluginFilter) -> Result<Vec<Plugin>, AppError> {
    let mut conditions: Vec<String> = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    // FTS search — strip reserved FTS5 characters and build a safe query
    let mut base_query = String::from("SELECT p.* FROM plugins p");
    if let Some(search_term) = filter.search.as_ref() {
        let escaped: String = search_term
            .chars()
            .filter(|c| c.is_alphanumeric() || c.is_whitespace())
            .collect();
        let words: Vec<String> = escaped
            .split_whitespace()
            .filter(|w| !w.is_empty())
            .map(|w| format!("\"{}\"*", w))
            .collect();
        if !words.is_empty() {
            let fts_query = words.join(" ");
            param_values.push(Box::new(fts_query));
            conditions.push(format!(
                "p.rowid IN (SELECT rowid FROM plugins_fts WHERE plugins_fts MATCH ?{})",
                param_values.len()
            ));
        }
        // If all characters were stripped, skip the FTS condition entirely.
    }

    if let Some(ref format) = filter.format {
        param_values.push(Box::new(format.clone()));
        conditions.push(format!("p.format = ?{}", param_values.len()));
    }
    if let Some(ref category) = filter.category {
        param_values.push(Box::new(category.clone()));
        conditions.push(format!("p.category = ?{}", param_values.len()));
    }
    if let Some(ref vendor) = filter.vendor {
        param_values.push(Box::new(vendor.clone()));
        conditions.push(format!("p.vendor = ?{}", param_values.len()));
    }
    if let Some(is_enabled) = filter.is_enabled {
        param_values.push(Box::new(is_enabled as i32));
        conditions.push(format!("p.is_enabled = ?{}", param_values.len()));
    }
    if let Some(ref collection_id) = filter.collection_id {
        param_values.push(Box::new(collection_id.clone()));
        base_query.push_str(&format!(
            " INNER JOIN collection_plugins cp ON p.id = cp.plugin_id AND cp.collection_id = ?{}",
            param_values.len()
        ));
    }
    if let Some(ref tag_id) = filter.tag_id {
        param_values.push(Box::new(tag_id.clone()));
        base_query.push_str(&format!(
            " INNER JOIN plugin_tags pt ON p.id = pt.plugin_id AND pt.tag_id = ?{}",
            param_values.len()
        ));
    }

    if !conditions.is_empty() {
        base_query.push_str(" WHERE ");
        base_query.push_str(&conditions.join(" AND "));
    }

    // Sort
    let sort_col = match filter.sort_by.as_deref() {
        Some("name") => "p.name",
        Some("vendor") => "p.vendor",
        Some("format") => "p.format",
        Some("category") => "p.category",
        Some("file_size_bytes") => "p.file_size_bytes",
        Some("updated_at") => "p.updated_at",
        Some("first_seen") => "p.first_seen",
        _ => "p.name",
    };
    let sort_dir = match filter.sort_dir.as_deref() {
        Some("desc") | Some("DESC") => "DESC",
        _ => "ASC",
    };
    base_query.push_str(&format!(" ORDER BY {} COLLATE NOCASE {}", sort_col, sort_dir));

    if let Some(limit) = filter.limit {
        param_values.push(Box::new(limit as i64));
        base_query.push_str(&format!(" LIMIT ?{}", param_values.len()));
    }
    if let Some(offset) = filter.offset {
        param_values.push(Box::new(offset as i64));
        base_query.push_str(&format!(" OFFSET ?{}", param_values.len()));
    }

    let mut stmt = conn.prepare(&base_query)?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    let rows = stmt.query_map(param_refs.as_slice(), |row| {
        Ok(Plugin {
            id: row.get(0)?,
            name: row.get(1)?,
            vendor: row.get(2)?,
            version: row.get(3)?,
            format: row.get(4)?,
            category: row.get(5)?,
            subcategory: row.get(6)?,
            file_path: row.get(7)?,
            file_size_bytes: row.get(8)?,
            architecture: row.get(9)?,
            is_enabled: row.get::<_, i32>(10)? != 0,
            original_path: row.get(11)?,
            disabled_path: row.get(12)?,
            hash: row.get(13)?,
            install_date: row.get(14)?,
            last_scanned: row.get(15)?,
            first_seen: row.get(16)?,
            notes: row.get(17)?,
            created_at: row.get(18)?,
            updated_at: row.get(19)?,
        })
    })?;

    let mut plugins = Vec::new();
    for row in rows {
        plugins.push(row?);
    }
    Ok(plugins)
}

pub fn get_plugin_by_id(conn: &Connection, id: &str) -> Result<Plugin, AppError> {
    let plugin = conn.query_row(
        "SELECT * FROM plugins WHERE id = ?1",
        params![id],
        |row| {
            Ok(Plugin {
                id: row.get(0)?,
                name: row.get(1)?,
                vendor: row.get(2)?,
                version: row.get(3)?,
                format: row.get(4)?,
                category: row.get(5)?,
                subcategory: row.get(6)?,
                file_path: row.get(7)?,
                file_size_bytes: row.get(8)?,
                architecture: row.get(9)?,
                is_enabled: row.get::<_, i32>(10)? != 0,
                original_path: row.get(11)?,
                disabled_path: row.get(12)?,
                hash: row.get(13)?,
                install_date: row.get(14)?,
                last_scanned: row.get(15)?,
                first_seen: row.get(16)?,
                notes: row.get(17)?,
                created_at: row.get(18)?,
                updated_at: row.get(19)?,
            })
        },
    )?;
    Ok(plugin)
}

pub fn update_plugin(conn: &Connection, id: &str, update: &PluginUpdate) -> Result<(), AppError> {
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let mut sets: Vec<String> = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref name) = update.name {
        param_values.push(Box::new(name.clone()));
        sets.push(format!("name = ?{}", param_values.len()));
    }
    if let Some(ref vendor) = update.vendor {
        param_values.push(Box::new(vendor.clone()));
        sets.push(format!("vendor = ?{}", param_values.len()));
    }
    if let Some(ref version) = update.version {
        param_values.push(Box::new(version.clone()));
        sets.push(format!("version = ?{}", param_values.len()));
    }
    if let Some(ref category) = update.category {
        param_values.push(Box::new(category.clone()));
        sets.push(format!("category = ?{}", param_values.len()));
    }
    if let Some(ref subcategory) = update.subcategory {
        param_values.push(Box::new(subcategory.clone()));
        sets.push(format!("subcategory = ?{}", param_values.len()));
    }
    if let Some(is_enabled) = update.is_enabled {
        param_values.push(Box::new(is_enabled as i32));
        sets.push(format!("is_enabled = ?{}", param_values.len()));
    }
    if let Some(ref file_path) = update.file_path {
        param_values.push(Box::new(file_path.clone()));
        sets.push(format!("file_path = ?{}", param_values.len()));
    }
    if let Some(ref original_path) = update.original_path {
        param_values.push(Box::new(original_path.clone()));
        sets.push(format!("original_path = ?{}", param_values.len()));
    }
    if update.clear_disabled_path {
        // Explicit clear overrides any `disabled_path` value supplied.
        sets.push("disabled_path = NULL".to_string());
    } else if let Some(ref disabled_path) = update.disabled_path {
        param_values.push(Box::new(disabled_path.clone()));
        sets.push(format!("disabled_path = ?{}", param_values.len()));
    }
    if let Some(ref notes) = update.notes {
        param_values.push(Box::new(notes.clone()));
        sets.push(format!("notes = ?{}", param_values.len()));
    }

    if sets.is_empty() {
        return Ok(());
    }

    param_values.push(Box::new(now.clone()));
    sets.push(format!("updated_at = ?{}", param_values.len()));

    param_values.push(Box::new(id.to_string()));
    let query = format!(
        "UPDATE plugins SET {} WHERE id = ?{}",
        sets.join(", "),
        param_values.len()
    );

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    conn.execute(&query, param_refs.as_slice())?;
    Ok(())
}

pub fn delete_plugin(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM plugins WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn get_stats(conn: &Connection) -> Result<Stats, AppError> {
    let total: u32 = conn.query_row("SELECT COUNT(*) FROM plugins", [], |row| row.get(0))?;
    let enabled: u32 = conn.query_row(
        "SELECT COUNT(*) FROM plugins WHERE is_enabled = 1",
        [],
        |row| row.get(0),
    )?;
    let disabled = total - enabled;

    let mut by_format = HashMap::new();
    let mut stmt = conn.prepare("SELECT format, COUNT(*) FROM plugins GROUP BY format")?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, u32>(1)?))
    })?;
    for row in rows {
        let (k, v) = row?;
        by_format.insert(k, v);
    }

    let mut by_category = HashMap::new();
    let mut stmt = conn.prepare(
        "SELECT COALESCE(category, 'Uncategorized'), COUNT(*) FROM plugins GROUP BY category",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, u32>(1)?))
    })?;
    for row in rows {
        let (k, v) = row?;
        by_category.insert(k, v);
    }

    let mut by_vendor = HashMap::new();
    let mut stmt = conn.prepare(
        "SELECT COALESCE(vendor, 'Unknown'), COUNT(*) FROM plugins GROUP BY vendor ORDER BY COUNT(*) DESC LIMIT 50",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, u32>(1)?))
    })?;
    for row in rows {
        let (k, v) = row?;
        by_vendor.insert(k, v);
    }

    Ok(Stats {
        total,
        enabled,
        disabled,
        by_format,
        by_category,
        by_vendor,
    })
}

// --- Tags ---

pub fn create_tag(conn: &Connection, name: &str, color: Option<&str>) -> Result<Tag, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO tags (id, name, color, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![id, name, color, now],
    )?;
    Ok(Tag {
        id,
        name: name.to_string(),
        color: color.map(|s| s.to_string()),
        created_at: now,
        plugin_count: Some(0),
    })
}

pub fn get_all_tags(conn: &Connection) -> Result<Vec<Tag>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name, t.color, t.created_at, COUNT(pt.plugin_id) as plugin_count
         FROM tags t LEFT JOIN plugin_tags pt ON t.id = pt.tag_id
         GROUP BY t.id ORDER BY t.name COLLATE NOCASE",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Tag {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            created_at: row.get(3)?,
            plugin_count: row.get(4)?,
        })
    })?;
    let mut tags = Vec::new();
    for row in rows {
        tags.push(row?);
    }
    Ok(tags)
}

pub fn delete_tag(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM tags WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn add_tag_to_plugin(conn: &Connection, plugin_id: &str, tag_id: &str) -> Result<(), AppError> {
    conn.execute(
        "INSERT OR IGNORE INTO plugin_tags (plugin_id, tag_id) VALUES (?1, ?2)",
        params![plugin_id, tag_id],
    )?;
    Ok(())
}

pub fn remove_tag_from_plugin(conn: &Connection, plugin_id: &str, tag_id: &str) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM plugin_tags WHERE plugin_id = ?1 AND tag_id = ?2",
        params![plugin_id, tag_id],
    )?;
    Ok(())
}

// --- Collections ---

pub fn create_collection(conn: &Connection, new: &NewCollection) -> Result<Collection, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let is_smart = new.is_smart.unwrap_or(false);
    conn.execute(
        "INSERT INTO collections (id, name, description, is_smart, smart_filter, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
        params![id, new.name, new.description, is_smart as i32, new.smart_filter, now],
    )?;
    Ok(Collection {
        id,
        name: new.name.clone(),
        description: new.description.clone(),
        is_smart,
        smart_filter: new.smart_filter.clone(),
        sort_order: 0,
        created_at: now.clone(),
        updated_at: now,
        plugin_count: Some(0),
    })
}

pub fn get_all_collections(conn: &Connection) -> Result<Vec<Collection>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT c.id, c.name, c.description, c.is_smart, c.smart_filter, c.sort_order,
         c.created_at, c.updated_at, COUNT(cp.plugin_id) as plugin_count
         FROM collections c LEFT JOIN collection_plugins cp ON c.id = cp.collection_id
         GROUP BY c.id ORDER BY c.sort_order, c.name COLLATE NOCASE",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Collection {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            is_smart: row.get::<_, i32>(3)? != 0,
            smart_filter: row.get(4)?,
            sort_order: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
            plugin_count: row.get(8)?,
        })
    })?;
    let mut collections = Vec::new();
    for row in rows {
        collections.push(row?);
    }
    Ok(collections)
}

pub fn delete_collection(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM collections WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn add_plugin_to_collection(
    conn: &Connection,
    collection_id: &str,
    plugin_id: &str,
) -> Result<(), AppError> {
    conn.execute(
        "INSERT OR IGNORE INTO collection_plugins (collection_id, plugin_id) VALUES (?1, ?2)",
        params![collection_id, plugin_id],
    )?;
    Ok(())
}

pub fn remove_plugin_from_collection(
    conn: &Connection,
    collection_id: &str,
    plugin_id: &str,
) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM collection_plugins WHERE collection_id = ?1 AND plugin_id = ?2",
        params![collection_id, plugin_id],
    )?;
    Ok(())
}

// --- Toggle History ---

pub fn insert_toggle_history(
    conn: &Connection,
    plugin_id: &str,
    action: &str,
    original_path: &str,
    target_path: &str,
    method: &str,
) -> Result<String, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO toggle_history (id, plugin_id, action, original_path, target_path, method, performed_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, plugin_id, action, original_path, target_path, method, now],
    )?;
    Ok(id)
}

pub fn get_last_toggle(conn: &Connection) -> Result<Option<ToggleHistoryEntry>, AppError> {
    let entry = conn
        .query_row(
            // performed_at has second precision, so rapid successive toggles
            // share a timestamp. rowid DESC is the insertion-order tiebreaker.
            "SELECT id, plugin_id, action, original_path, target_path, method, performed_at, undone
             FROM toggle_history WHERE undone = 0 ORDER BY performed_at DESC, rowid DESC LIMIT 1",
            [],
            |row| {
                Ok(ToggleHistoryEntry {
                    id: row.get(0)?,
                    plugin_id: row.get(1)?,
                    action: row.get(2)?,
                    original_path: row.get(3)?,
                    target_path: row.get(4)?,
                    method: row.get(5)?,
                    performed_at: row.get(6)?,
                    undone: row.get::<_, i32>(7)? != 0,
                })
            },
        )
        .optional()?;
    Ok(entry)
}

pub fn mark_toggle_undone(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute(
        "UPDATE toggle_history SET undone = 1 WHERE id = ?1",
        params![id],
    )?;
    Ok(())
}

pub fn get_toggle_history_by_id(
    conn: &Connection,
    id: &str,
) -> Result<Option<ToggleHistoryEntry>, AppError> {
    let entry = conn
        .query_row(
            "SELECT id, plugin_id, action, original_path, target_path, method, performed_at, undone
             FROM toggle_history WHERE id = ?1",
            params![id],
            |row| {
                Ok(ToggleHistoryEntry {
                    id: row.get(0)?,
                    plugin_id: row.get(1)?,
                    action: row.get(2)?,
                    original_path: row.get(3)?,
                    target_path: row.get(4)?,
                    method: row.get(5)?,
                    performed_at: row.get(6)?,
                    undone: row.get::<_, i32>(7)? != 0,
                })
            },
        )
        .optional()?;
    Ok(entry)
}

pub fn get_toggle_history(
    conn: &Connection,
    limit: i32,
) -> Result<Vec<ToggleHistoryWithPlugin>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT h.id, h.plugin_id, COALESCE(p.name, '(deleted plugin)') as plugin_name,
                h.action, h.original_path, h.target_path, h.method, h.performed_at, h.undone
         FROM toggle_history h
         LEFT JOIN plugins p ON p.id = h.plugin_id
         ORDER BY h.performed_at DESC, h.rowid DESC
         LIMIT ?1",
    )?;
    let rows = stmt.query_map(params![limit], |row| {
        Ok(ToggleHistoryWithPlugin {
            id: row.get(0)?,
            plugin_id: row.get(1)?,
            plugin_name: row.get(2)?,
            action: row.get(3)?,
            original_path: row.get(4)?,
            target_path: row.get(5)?,
            method: row.get(6)?,
            performed_at: row.get(7)?,
            undone: row.get::<_, i32>(8)? != 0,
        })
    })?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row?);
    }
    Ok(out)
}

/// Build an in-memory cache of existing plugin hashes keyed by file_path.
/// Scanner uses this to skip re-hashing files whose path + size are unchanged.
/// Value is (file_size_bytes, hash).
pub fn build_hash_cache(
    conn: &Connection,
) -> Result<HashMap<String, (i64, String)>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT file_path, file_size_bytes, hash FROM plugins
         WHERE hash IS NOT NULL AND hash != '' AND file_size_bytes IS NOT NULL",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, i64>(1)?,
            row.get::<_, String>(2)?,
        ))
    })?;
    let mut map = HashMap::new();
    for row in rows {
        let (path, size, hash) = row?;
        map.insert(path, (size, hash));
    }
    Ok(map)
}

// --- Scan Paths ---

pub fn get_scan_paths(conn: &Connection) -> Result<Vec<ScanPath>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, path, format, is_default, is_enabled, added_at FROM scan_paths ORDER BY is_default DESC, path",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(ScanPath {
            id: row.get(0)?,
            path: row.get(1)?,
            format: row.get(2)?,
            is_default: row.get::<_, i32>(3)? != 0,
            is_enabled: row.get::<_, i32>(4)? != 0,
            added_at: row.get(5)?,
        })
    })?;
    let mut paths = Vec::new();
    for row in rows {
        paths.push(row?);
    }
    Ok(paths)
}

pub fn insert_scan_path(
    conn: &Connection,
    path: &str,
    format: Option<&str>,
    is_default: bool,
) -> Result<ScanPath, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT OR IGNORE INTO scan_paths (id, path, format, is_default, is_enabled, added_at)
         VALUES (?1, ?2, ?3, ?4, 1, ?5)",
        params![id, path, format, is_default as i32, now],
    )?;
    Ok(ScanPath {
        id,
        path: path.to_string(),
        format: format.map(|s| s.to_string()),
        is_default,
        is_enabled: true,
        added_at: now,
    })
}

pub fn remove_scan_path(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM scan_paths WHERE id = ?1", params![id])?;
    Ok(())
}

// --- Settings ---

pub fn get_all_settings(conn: &Connection) -> Result<Settings, AppError> {
    let get = |key: &str| -> Result<String, AppError> {
        let val: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                params![key],
                |row| row.get(0),
            )
            .unwrap_or_default();
        Ok(val)
    };

    Ok(Settings {
        disabled_folder: get("disabled_folder")?,
        toggle_method: get("toggle_method")?,
        theme: get("theme")?,
        auto_scan_on_launch: get("auto_scan_on_launch")? == "true",
        ai_provider: get("ai_provider")?,
        ai_model: get("ai_model")?,
        ai_api_key: get("ai_api_key")?,
    })
}

pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>, AppError> {
    let val = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![key],
            |row| row.get(0),
        )
        .optional()?;
    Ok(val)
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<(), AppError> {
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params![key, value],
    )?;
    Ok(())
}

// --- AI helpers ---

pub fn get_plugins_for_ai(conn: &Connection, uncategorized_only: bool) -> Result<Vec<Plugin>, AppError> {
    let filter = if uncategorized_only {
        PluginFilter {
            category: Some("".to_string()),
            ..Default::default()
        }
    } else {
        PluginFilter::default()
    };

    if uncategorized_only {
        // Special query for uncategorized
        let mut stmt = conn.prepare(
            "SELECT * FROM plugins WHERE category IS NULL OR category = '' ORDER BY name COLLATE NOCASE",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(Plugin {
                id: row.get(0)?,
                name: row.get(1)?,
                vendor: row.get(2)?,
                version: row.get(3)?,
                format: row.get(4)?,
                category: row.get(5)?,
                subcategory: row.get(6)?,
                file_path: row.get(7)?,
                file_size_bytes: row.get(8)?,
                architecture: row.get(9)?,
                is_enabled: row.get::<_, i32>(10)? != 0,
                original_path: row.get(11)?,
                disabled_path: row.get(12)?,
                hash: row.get(13)?,
                install_date: row.get(14)?,
                last_scanned: row.get(15)?,
                first_seen: row.get(16)?,
                notes: row.get(17)?,
                created_at: row.get(18)?,
                updated_at: row.get(19)?,
            })
        })?;
        let mut plugins = Vec::new();
        for row in rows {
            plugins.push(row?);
        }
        Ok(plugins)
    } else {
        get_all_plugins(conn, &filter)
    }
}

pub fn get_plugins_by_hash(conn: &Connection) -> Result<HashMap<String, Vec<Plugin>>, AppError> {
    let all = get_all_plugins(conn, &PluginFilter::default())?;
    let mut by_hash: HashMap<String, Vec<Plugin>> = HashMap::new();
    for plugin in all {
        if let Some(ref hash) = plugin.hash {
            if !hash.is_empty() {
                by_hash.entry(hash.clone()).or_default().push(plugin);
            }
        }
    }
    // Only keep groups with duplicates
    by_hash.retain(|_, v| v.len() > 1);
    Ok(by_hash)
}
