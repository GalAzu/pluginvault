use std::collections::HashMap;
use std::time::Instant;
use tauri::{AppHandle, Emitter, State};

use crate::db::connection::Database;
use crate::db::models::{NewPlugin, ScanPath, ScanProgress, ScanSummary, UpsertResult};
use crate::db::queries;
use crate::scanner::{discovery, metadata, paths};

const UPSERT_BATCH_SIZE: usize = 50;

#[tauri::command]
pub fn scan_plugins(
    app: AppHandle,
    db: State<'_, Database>,
    custom_paths: Option<Vec<String>>,
) -> Result<ScanSummary, String> {
    let start = Instant::now();

    // Emit starting event
    let _ = app.emit(
        "scan-progress",
        ScanProgress {
            current_path: String::new(),
            plugins_found: 0,
            directories_scanned: 0,
            phase: "starting".to_string(),
        },
    );

    // --- Phase 1: briefly hold the mutex to read scan paths + hash cache ---
    let (scan_configs, hash_cache): (Vec<_>, HashMap<String, (i64, String)>) = {
        let conn = db.conn();

        let scan_configs: Vec<crate::db::models::ScanPathConfig> = if let Some(ref custom) = custom_paths {
            custom
                .iter()
                .map(|p| crate::db::models::ScanPathConfig {
                    path: p.clone(),
                    format: "".to_string(),
                    is_default: false,
                })
                .collect()
        } else {
            let db_paths = queries::get_scan_paths(&conn).map_err(|e| e.to_string())?;
            if db_paths.is_empty() {
                let defaults = paths::get_default_scan_paths();
                for p in &defaults {
                    let _ = queries::insert_scan_path(&conn, &p.path, Some(&p.format), true);
                }
                defaults
            } else {
                db_paths
                    .into_iter()
                    .filter(|p| p.is_enabled)
                    .map(|p| crate::db::models::ScanPathConfig {
                        path: p.path,
                        format: p.format.unwrap_or_default(),
                        is_default: p.is_default,
                    })
                    .collect()
            }
        };

        let hash_cache = queries::build_hash_cache(&conn).map_err(|e| e.to_string())?;

        (scan_configs, hash_cache)
        // mutex guard drops here
    };

    let paths_scanned: Vec<String> = scan_configs.iter().map(|p| p.path.clone()).collect();

    // --- Phase 2: discovery + metadata extraction WITHOUT holding the DB mutex ---
    let app_clone = app.clone();
    let discovered = discovery::discover_plugins(&scan_configs, move |progress| {
        let _ = app_clone.emit("scan-progress", progress);
    })
    .map_err(|e| e.to_string())?;

    // Emit hashing phase start
    let _ = app.emit(
        "scan-progress",
        ScanProgress {
            current_path: String::new(),
            plugins_found: discovered.len() as u32,
            directories_scanned: 0,
            phase: "hashing".to_string(),
        },
    );

    let mut prepared: Vec<(NewPlugin, String)> = Vec::with_capacity(discovered.len());
    let mut errors: Vec<String> = Vec::new();

    for disc in &discovered {
        let file_path_str = disc.path.to_string_lossy().to_string();
        let cached = hash_cache
            .get(&file_path_str)
            .map(|(size, hash)| (*size, hash.as_str()));

        match metadata::extract_metadata_cached(&disc.path, &disc.format, cached) {
            Ok(meta) => {
                let new_plugin = NewPlugin {
                    name: meta.name,
                    vendor: meta.vendor,
                    version: meta.version,
                    format: disc.format.clone(),
                    category: meta.category,
                    subcategory: meta.subcategory,
                    file_path: file_path_str.clone(),
                    file_size_bytes: Some(meta.file_size_bytes),
                    architecture: meta.architecture,
                    hash: Some(meta.hash),
                    install_date: meta.install_date,
                };
                prepared.push((new_plugin, file_path_str));
            }
            Err(e) => {
                errors.push(format!("{}: {}", disc.path.display(), e));
            }
        }
    }

    // --- Phase 3: re-acquire the mutex and upsert in batched transactions ---
    let _ = app.emit(
        "scan-progress",
        ScanProgress {
            current_path: String::new(),
            plugins_found: prepared.len() as u32,
            directories_scanned: 0,
            phase: "saving".to_string(),
        },
    );

    let mut new_count: u32 = 0;
    let mut updated_count: u32 = 0;

    for chunk in prepared.chunks(UPSERT_BATCH_SIZE) {
        let mut conn = db.conn();
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        for (new_plugin, path_str) in chunk {
            match queries::upsert_plugin(&tx, new_plugin) {
                Ok(UpsertResult::Inserted) => new_count += 1,
                Ok(UpsertResult::Updated) => updated_count += 1,
                Err(e) => errors.push(format!("{}: {}", path_str, e)),
            }
        }
        tx.commit().map_err(|e| e.to_string())?;
        // mutex guard dropped at the end of each chunk, giving other commands a chance
    }

    let duration = start.elapsed().as_millis() as u64;

    let _ = app.emit(
        "scan-progress",
        ScanProgress {
            current_path: String::new(),
            plugins_found: discovered.len() as u32,
            directories_scanned: 0,
            phase: "done".to_string(),
        },
    );

    Ok(ScanSummary {
        total_found: discovered.len() as u32,
        new_plugins: new_count,
        updated_plugins: updated_count,
        scan_duration_ms: duration,
        paths_scanned,
        errors,
    })
}

#[tauri::command]
pub fn get_scan_paths(db: State<'_, Database>) -> Result<Vec<ScanPath>, String> {
    let conn = db.conn();
    queries::get_scan_paths(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_scan_path(
    db: State<'_, Database>,
    path: String,
    format: Option<String>,
) -> Result<ScanPath, String> {
    let conn = db.conn();
    queries::insert_scan_path(&conn, &path, format.as_deref(), false)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_scan_path(db: State<'_, Database>, id: String) -> Result<(), String> {
    let conn = db.conn();
    queries::remove_scan_path(&conn, &id).map_err(|e| e.to_string())
}
