use tauri::State;

use crate::db::connection::Database;
use crate::db::models::{BulkResult, Plugin, PluginFilter, PluginUpdate, Stats};
use crate::db::queries;
use crate::filemanager::{backup, move_ops};

#[tauri::command]
pub fn get_plugins(
    db: State<'_, Database>,
    filter: Option<PluginFilter>,
) -> Result<Vec<Plugin>, String> {
    let conn = db.conn();
    let filter = filter.unwrap_or_default();
    queries::get_all_plugins(&conn, &filter).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_plugin(db: State<'_, Database>, id: String) -> Result<Plugin, String> {
    let conn = db.conn();
    queries::get_plugin_by_id(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_plugin(
    db: State<'_, Database>,
    id: String,
    update: PluginUpdate,
) -> Result<(), String> {
    let conn = db.conn();
    queries::update_plugin(&conn, &id, &update).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_plugin(db: State<'_, Database>, id: String) -> Result<(), String> {
    let conn = db.conn();
    queries::delete_plugin(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_stats(db: State<'_, Database>) -> Result<Stats, String> {
    let conn = db.conn();
    queries::get_stats(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_plugins_to_file(
    db: State<'_, Database>,
    destination: String,
    format: String,
) -> Result<String, String> {
    let conn = db.conn();
    let plugins = queries::get_all_plugins(&conn, &PluginFilter::default())
        .map_err(|e| e.to_string())?;
    drop(conn);

    let content = match format.as_str() {
        "csv" => {
            fn csv_escape(field: &str) -> String {
                // RFC 4180: wrap every text field in quotes and double internal quotes.
                // This is safe regardless of whether the field contains commas, quotes,
                // or newlines — and predictable for round-tripping.
                format!("\"{}\"", field.replace('"', "\"\""))
            }
            let mut s = String::from("Name,Vendor,Format,Category,Path,Size,Status\n");
            for p in &plugins {
                s.push_str(&format!(
                    "{},{},{},{},{},{},{}\n",
                    csv_escape(&p.name),
                    csv_escape(p.vendor.as_deref().unwrap_or("")),
                    csv_escape(&p.format),
                    csv_escape(p.category.as_deref().unwrap_or("")),
                    csv_escape(&p.file_path),
                    p.file_size_bytes.unwrap_or(0),
                    if p.is_enabled { "Enabled" } else { "Disabled" }
                ));
            }
            s
        }
        "markdown" => {
            let mut s = String::from(
                "# My Plugin Library\n\n| Name | Vendor | Format | Category | Status |\n|---|---|---|---|---|\n",
            );
            for p in &plugins {
                s.push_str(&format!(
                    "| {} | {} | {} | {} | {} |\n",
                    p.name,
                    p.vendor.as_deref().unwrap_or("—"),
                    p.format,
                    p.category.as_deref().unwrap_or("—"),
                    if p.is_enabled { "✓" } else { "✗" }
                ));
            }
            s
        }
        _ => return Err(format!("Unknown format: {}", format)),
    };

    std::fs::write(&destination, content).map_err(|e| e.to_string())?;
    Ok(destination)
}

// --- Reveal in Finder/Explorer ---

#[tauri::command]
pub fn reveal_in_file_manager(path: String) -> Result<(), String> {
    use std::process::Command;
    let p = std::path::PathBuf::from(&path);
    if !p.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        // Fall back to opening the parent directory
        let parent = p.parent().unwrap_or(&p);
        Command::new("xdg-open")
            .arg(parent)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// --- Move plugin(s) ---

#[tauri::command]
pub fn move_plugin(
    db: State<'_, Database>,
    plugin_id: String,
    destination: String,
) -> Result<String, String> {
    let conn = db.conn();
    let plugin = queries::get_plugin_by_id(&conn, &plugin_id).map_err(|e| e.to_string())?;
    let dest = std::path::PathBuf::from(&destination);

    let result = move_ops::move_plugin_to(&plugin, &dest).map_err(|e| e.to_string())?;

    // Record as toggle_history action "move" so undo works
    backup::record_toggle(
        &conn,
        &plugin_id,
        "move",
        &result.original_path,
        &result.target_path,
        "move",
    )
    .map_err(|e| e.to_string())?;

    // Update file_path in DB
    queries::update_plugin(
        &conn,
        &plugin_id,
        &PluginUpdate {
            file_path: Some(result.target_path.clone()),
            ..Default::default()
        },
    )
    .map_err(|e| e.to_string())?;

    Ok(format!("Moved to {}", result.target_path))
}

#[tauri::command]
pub fn bulk_move_plugins(
    db: State<'_, Database>,
    plugin_ids: Vec<String>,
    destination: String,
) -> Result<BulkResult, String> {
    let conn = db.conn();
    let dest = std::path::PathBuf::from(&destination);
    let mut succeeded = 0u32;
    let mut failed = 0u32;
    let mut errors: Vec<String> = Vec::new();

    for id in &plugin_ids {
        match queries::get_plugin_by_id(&conn, id) {
            Ok(plugin) => match move_ops::move_plugin_to(&plugin, &dest) {
                Ok(result) => {
                    let _ = backup::record_toggle(
                        &conn,
                        id,
                        "move",
                        &result.original_path,
                        &result.target_path,
                        "move",
                    );
                    let _ = queries::update_plugin(
                        &conn,
                        id,
                        &PluginUpdate {
                            file_path: Some(result.target_path.clone()),
                            ..Default::default()
                        },
                    );
                    succeeded += 1;
                }
                Err(e) => {
                    failed += 1;
                    errors.push(format!("{}: {}", plugin.name, e));
                }
            },
            Err(e) => {
                failed += 1;
                errors.push(format!("{}: {}", id, e));
            }
        }
    }

    Ok(BulkResult {
        succeeded,
        failed,
        errors,
    })
}

// --- Auto-organize by vendor ---

#[tauri::command]
pub fn auto_organize_by_vendor(
    db: State<'_, Database>,
    base_path: String,
) -> Result<BulkResult, String> {
    let conn = db.conn();
    let plugins = queries::get_all_plugins(&conn, &PluginFilter::default())
        .map_err(|e| e.to_string())?;
    let base = std::path::PathBuf::from(&base_path);
    let mut succeeded = 0u32;
    let mut failed = 0u32;
    let mut errors: Vec<String> = Vec::new();

    for plugin in &plugins {
        // Only move enabled plugins — skip disabled ones to avoid breaking the toggle chain
        if !plugin.is_enabled {
            continue;
        }
        let vendor = plugin.vendor.as_deref().unwrap_or("Unknown");
        // Sanitize vendor name for filesystem
        let safe_vendor: String = vendor
            .chars()
            .map(|c| {
                if c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' || c == '&' {
                    c
                } else {
                    '_'
                }
            })
            .collect();
        let safe_vendor = safe_vendor.trim().to_string();
        let safe_vendor = if safe_vendor.is_empty() {
            "Unknown".to_string()
        } else {
            safe_vendor
        };
        let vendor_dir = base.join(&safe_vendor);

        // Skip if already in the correct vendor folder
        let current_parent = std::path::PathBuf::from(&plugin.file_path)
            .parent()
            .map(|p| p.to_path_buf());
        if let Some(parent) = current_parent.as_ref() {
            // Compare canonicalized forms when possible to avoid false negatives
            let parent_canon = parent.canonicalize().ok();
            let vendor_canon = vendor_dir.canonicalize().ok();
            if parent_canon.is_some() && parent_canon == vendor_canon {
                continue;
            }
            if parent_canon.is_none() && parent == &vendor_dir {
                continue;
            }
        }

        match move_ops::move_plugin_to(plugin, &vendor_dir) {
            Ok(result) => {
                let _ = backup::record_toggle(
                    &conn,
                    &plugin.id,
                    "move",
                    &result.original_path,
                    &result.target_path,
                    "move",
                );
                let _ = queries::update_plugin(
                    &conn,
                    &plugin.id,
                    &PluginUpdate {
                        file_path: Some(result.target_path.clone()),
                        ..Default::default()
                    },
                );
                succeeded += 1;
            }
            Err(e) => {
                failed += 1;
                errors.push(format!("{}: {}", plugin.name, e));
            }
        }
    }

    Ok(BulkResult {
        succeeded,
        failed,
        errors,
    })
}

// --- Permanent delete ---

#[tauri::command]
pub fn delete_plugin_permanent(
    db: State<'_, Database>,
    plugin_id: String,
    delete_file: bool,
) -> Result<String, String> {
    let conn = db.conn();
    let plugin = queries::get_plugin_by_id(&conn, &plugin_id).map_err(|e| e.to_string())?;

    if delete_file {
        let path = std::path::PathBuf::from(&plugin.file_path);
        if path.exists() {
            let canonical = path
                .canonicalize()
                .map_err(|e| format!("Failed to resolve: {}", e))?;
            crate::filemanager::permissions::check_write_permission(&canonical)
                .map_err(|e| e.to_string())?;
            if canonical.is_dir() {
                std::fs::remove_dir_all(&canonical).map_err(|e| e.to_string())?;
            } else {
                std::fs::remove_file(&canonical).map_err(|e| e.to_string())?;
            }
        }
    }

    queries::delete_plugin(&conn, &plugin_id).map_err(|e| e.to_string())?;

    Ok(if delete_file {
        format!("Deleted {} from disk and database", plugin.name)
    } else {
        format!("Removed {} from database (file preserved)", plugin.name)
    })
}
