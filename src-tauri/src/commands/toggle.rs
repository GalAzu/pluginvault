use std::path::PathBuf;
use tauri::State;

use crate::db::connection::Database;
use crate::db::models::{BulkResult, PluginUpdate, ToggleHistoryWithPlugin};
use crate::db::queries;
use crate::filemanager::{backup, toggle};

#[tauri::command]
pub fn disable_plugin(db: State<'_, Database>, plugin_id: String) -> Result<String, String> {
    let conn = db.conn();
    disable_plugin_inner(&conn, &plugin_id)
}

#[tauri::command]
pub fn enable_plugin(db: State<'_, Database>, plugin_id: String) -> Result<String, String> {
    let conn = db.conn();
    enable_plugin_inner(&conn, &plugin_id)
}

/// Shared disable logic. Requires caller to hold the DB connection.
pub(crate) fn disable_plugin_inner(
    conn: &rusqlite::Connection,
    plugin_id: &str,
) -> Result<String, String> {
    let plugin = queries::get_plugin_by_id(conn, plugin_id).map_err(|e| e.to_string())?;

    if !plugin.is_enabled {
        return Err("Plugin is already disabled".to_string());
    }

    let settings = queries::get_all_settings(conn).map_err(|e| e.to_string())?;

    // Determine disabled folder
    let disabled_folder = if settings.disabled_folder.is_empty() {
        // Default: alongside the plugin's parent directory
        let plugin_path = PathBuf::from(&plugin.file_path);
        plugin_path
            .parent()
            .unwrap_or(&plugin_path)
            .parent()
            .unwrap_or(&plugin_path)
            .join("PluginVault Disabled")
    } else {
        PathBuf::from(&settings.disabled_folder)
    };

    let result =
        toggle::disable_plugin(&plugin, &disabled_folder, &settings.toggle_method)
            .map_err(|e| e.to_string())?;

    // Record in history
    backup::record_toggle(
        conn,
        plugin_id,
        "disable",
        &result.original_path,
        &result.target_path,
        &result.method,
    )
    .map_err(|e| e.to_string())?;

    // Update plugin record: file_path now points to the disabled location so the
    // next scan won't re-discover the file as a new plugin.
    queries::update_plugin(
        conn,
        plugin_id,
        &PluginUpdate {
            is_enabled: Some(false),
            file_path: Some(result.target_path.clone()),
            original_path: Some(result.original_path.clone()),
            disabled_path: Some(result.target_path.clone()),
            ..Default::default()
        },
    )
    .map_err(|e| e.to_string())?;

    Ok(format!("Disabled: moved to {}", result.target_path))
}

/// Shared enable logic. Requires caller to hold the DB connection.
pub(crate) fn enable_plugin_inner(
    conn: &rusqlite::Connection,
    plugin_id: &str,
) -> Result<String, String> {
    let plugin = queries::get_plugin_by_id(conn, plugin_id).map_err(|e| e.to_string())?;

    if plugin.is_enabled {
        return Err("Plugin is already enabled".to_string());
    }

    let settings = queries::get_all_settings(conn).map_err(|e| e.to_string())?;

    let result =
        toggle::enable_plugin(&plugin, &settings.toggle_method).map_err(|e| e.to_string())?;

    // Record in history
    backup::record_toggle(
        conn,
        plugin_id,
        "enable",
        &result.original_path,
        &result.target_path,
        &result.method,
    )
    .map_err(|e| e.to_string())?;

    // Update plugin record — file_path now points back to the restored (original) location.
    // Clear disabled_path; keep original_path for historical reference.
    queries::update_plugin(
        conn,
        plugin_id,
        &PluginUpdate {
            is_enabled: Some(true),
            file_path: Some(result.target_path.clone()),
            clear_disabled_path: true,
            ..Default::default()
        },
    )
    .map_err(|e| e.to_string())?;

    Ok(format!("Enabled: restored to {}", result.target_path))
}

#[tauri::command]
pub fn bulk_enable_plugins(
    db: State<'_, Database>,
    plugin_ids: Vec<String>,
) -> Result<BulkResult, String> {
    let conn = db.conn();
    let mut result = BulkResult::default();
    for id in &plugin_ids {
        match enable_plugin_inner(&conn, id) {
            Ok(_) => result.succeeded += 1,
            Err(e) => {
                result.failed += 1;
                result.errors.push(format!("{}: {}", id, e));
            }
        }
    }
    Ok(result)
}

#[tauri::command]
pub fn bulk_disable_plugins(
    db: State<'_, Database>,
    plugin_ids: Vec<String>,
) -> Result<BulkResult, String> {
    let conn = db.conn();
    let mut result = BulkResult::default();
    for id in &plugin_ids {
        match disable_plugin_inner(&conn, id) {
            Ok(_) => result.succeeded += 1,
            Err(e) => {
                result.failed += 1;
                result.errors.push(format!("{}: {}", id, e));
            }
        }
    }
    Ok(result)
}

#[tauri::command]
pub fn undo_last_toggle(db: State<'_, Database>) -> Result<String, String> {
    let conn = db.conn();

    let last = backup::get_last_undoable(&conn)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No toggle action to undo".to_string())?;

    undo_toggle_entry(&conn, &last)
}

#[tauri::command]
pub fn undo_toggle_by_id(db: State<'_, Database>, history_id: String) -> Result<String, String> {
    let conn = db.conn();

    let entry = queries::get_toggle_history_by_id(&conn, &history_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Toggle history entry not found: {}", history_id))?;

    if entry.undone {
        return Err("This toggle action has already been undone".to_string());
    }

    undo_toggle_entry(&conn, &entry)
}

#[tauri::command]
pub fn get_toggle_history(
    db: State<'_, Database>,
    limit: Option<i32>,
) -> Result<Vec<ToggleHistoryWithPlugin>, String> {
    let conn = db.conn();
    queries::get_toggle_history(&conn, limit.unwrap_or(50))
        .map_err(|e| e.to_string())
}

/// Shared undo logic: reverses the given history entry.
fn undo_toggle_entry(
    conn: &rusqlite::Connection,
    entry: &crate::db::models::ToggleHistoryEntry,
) -> Result<String, String> {
    let plugin = queries::get_plugin_by_id(conn, &entry.plugin_id).map_err(|e| e.to_string())?;
    let settings = queries::get_all_settings(conn).map_err(|e| e.to_string())?;

    match entry.action.as_str() {
        "disable" => {
            // Undo disable = enable
            let result = toggle::enable_plugin(&plugin, &settings.toggle_method)
                .map_err(|e| e.to_string())?;

            queries::update_plugin(
                conn,
                &entry.plugin_id,
                &PluginUpdate {
                    is_enabled: Some(true),
                    file_path: Some(result.target_path.clone()),
                    disabled_path: Some(String::new()),
                    ..Default::default()
                },
            )
            .map_err(|e| e.to_string())?;

            backup::mark_undone(conn, &entry.id).map_err(|e| e.to_string())?;

            Ok(format!("Undone: re-enabled {}", result.target_path))
        }
        "enable" => {
            // Undo enable = disable
            let disabled_folder = if settings.disabled_folder.is_empty() {
                let p = PathBuf::from(&plugin.file_path);
                p.parent()
                    .unwrap_or(&p)
                    .parent()
                    .unwrap_or(&p)
                    .join("PluginVault Disabled")
            } else {
                PathBuf::from(&settings.disabled_folder)
            };

            let result = toggle::disable_plugin(&plugin, &disabled_folder, &settings.toggle_method)
                .map_err(|e| e.to_string())?;

            queries::update_plugin(
                conn,
                &entry.plugin_id,
                &PluginUpdate {
                    is_enabled: Some(false),
                    file_path: Some(result.target_path.clone()),
                    original_path: Some(result.original_path.clone()),
                    disabled_path: Some(result.target_path.clone()),
                    ..Default::default()
                },
            )
            .map_err(|e| e.to_string())?;

            backup::mark_undone(conn, &entry.id).map_err(|e| e.to_string())?;

            Ok(format!("Undone: re-disabled to {}", result.target_path))
        }
        "move" => {
            // Undo move = move it back. The original move recorded
            // original_path = pre-move location, target_path = post-move location.
            // To reverse, we move the file from target_path back to the parent
            // directory of original_path.
            use std::path::PathBuf;
            let current = PathBuf::from(&entry.target_path);
            let original = PathBuf::from(&entry.original_path);
            let parent = original
                .parent()
                .ok_or_else(|| "Original path has no parent".to_string())?;

            if !current.exists() {
                return Err(format!(
                    "Cannot undo move: source no longer exists at {}",
                    current.display()
                ));
            }
            if original.exists() {
                return Err(format!(
                    "Cannot undo move: original location is now occupied: {}",
                    original.display()
                ));
            }

            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            crate::filemanager::toggle::safe_move_public(&current, &original)
                .map_err(|e| e.to_string())?;

            queries::update_plugin(
                conn,
                &entry.plugin_id,
                &PluginUpdate {
                    file_path: Some(entry.original_path.clone()),
                    ..Default::default()
                },
            )
            .map_err(|e| e.to_string())?;

            // Suppress unused warning if `plugin` ends up not being needed below
            let _ = &plugin;

            backup::mark_undone(conn, &entry.id).map_err(|e| e.to_string())?;

            Ok(format!("Undone: moved back to {}", entry.original_path))
        }
        _ => Err(format!("Unknown toggle action: {}", entry.action)),
    }
}
