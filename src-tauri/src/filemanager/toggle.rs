use std::fs;
use std::path::{Path, PathBuf};

use crate::db::models::{Plugin, ToggleResult};
use crate::utils::errors::AppError;

/// Disable a plugin by moving or renaming it
pub fn disable_plugin(
    plugin: &Plugin,
    disabled_folder: &Path,
    method: &str,
) -> Result<ToggleResult, AppError> {
    let source = PathBuf::from(&plugin.file_path);

    // Safety: verify source exists
    if !source.exists() {
        return Err(AppError::Scanner(format!(
            "Plugin file not found: {}",
            source.display()
        )));
    }

    // Canonicalize to prevent symlink attacks
    let source = source.canonicalize().map_err(|e| {
        AppError::General(format!("Failed to resolve path {}: {}", plugin.file_path, e))
    })?;

    // Check permissions
    super::permissions::check_write_permission(&source)?;

    match method {
        "rename" => disable_by_rename(&source),
        _ => disable_by_move(&source, disabled_folder, &plugin.format),
    }
}

/// Enable a plugin by moving it back or removing the .disabled suffix
pub fn enable_plugin(plugin: &Plugin, method: &str) -> Result<ToggleResult, AppError> {
    let original_path = plugin
        .original_path
        .as_ref()
        .ok_or_else(|| AppError::General("No original path recorded for this plugin".to_string()))?;

    let current_path = if plugin.is_enabled {
        return Err(AppError::General("Plugin is already enabled".to_string()));
    } else {
        plugin
            .disabled_path
            .as_ref()
            .unwrap_or(&plugin.file_path)
    };

    let source = PathBuf::from(current_path);
    let target = PathBuf::from(original_path);

    if !source.exists() {
        return Err(AppError::Scanner(format!(
            "Disabled plugin file not found: {}",
            source.display()
        )));
    }

    // Canonicalize source to prevent symlink attacks
    let source = source.canonicalize().map_err(|e| {
        AppError::General(format!("Failed to resolve path: {}", e))
    })?;

    // Check that destination doesn't already exist
    if target.exists() {
        return Err(AppError::General(format!(
            "Target path already exists: {}",
            target.display()
        )));
    }

    match method {
        "rename" => enable_by_rename(&source),
        _ => {
            // Move method: move back to original location
            safe_move(&source, &target)?;
            Ok(ToggleResult {
                success: true,
                original_path: source.to_string_lossy().to_string(),
                target_path: target.to_string_lossy().to_string(),
                method: "move".to_string(),
            })
        }
    }
}

fn disable_by_move(source: &Path, disabled_folder: &Path, format: &str) -> Result<ToggleResult, AppError> {
    let format_folder = disabled_folder.join(format);
    fs::create_dir_all(&format_folder)?;

    let file_name = source
        .file_name()
        .ok_or_else(|| AppError::General("Invalid file name".to_string()))?;
    let target = format_folder.join(file_name);

    if target.exists() {
        return Err(AppError::General(format!(
            "Destination already exists: {}",
            target.display()
        )));
    }

    safe_move(source, &target)?;

    Ok(ToggleResult {
        success: true,
        original_path: source.to_string_lossy().to_string(),
        target_path: target.to_string_lossy().to_string(),
        method: "move".to_string(),
    })
}

fn disable_by_rename(source: &Path) -> Result<ToggleResult, AppError> {
    let new_name = format!(
        "{}.disabled",
        source.file_name().unwrap_or_default().to_string_lossy()
    );
    let target = source.with_file_name(&new_name);

    if target.exists() {
        return Err(AppError::General(format!(
            "Renamed target already exists: {}",
            target.display()
        )));
    }

    fs::rename(source, &target)?;

    Ok(ToggleResult {
        success: true,
        original_path: source.to_string_lossy().to_string(),
        target_path: target.to_string_lossy().to_string(),
        method: "rename".to_string(),
    })
}

fn enable_by_rename(source: &Path) -> Result<ToggleResult, AppError> {
    let name = source
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let original_name = name.trim_end_matches(".disabled");
    let target = source.with_file_name(original_name);

    if target.exists() {
        return Err(AppError::General(format!(
            "Original path already exists: {}",
            target.display()
        )));
    }

    fs::rename(source, &target)?;

    Ok(ToggleResult {
        success: true,
        original_path: source.to_string_lossy().to_string(),
        target_path: target.to_string_lossy().to_string(),
        method: "rename".to_string(),
    })
}

/// Public wrapper around `safe_move` for use by other filemanager modules
/// (e.g. `move_ops`). Kept as a thin shim so the cross-device fallback logic
/// is implemented in exactly one place.
pub fn safe_move_public(source: &Path, target: &Path) -> Result<(), AppError> {
    safe_move(source, target)
}

/// Move a file or directory, handling cross-device moves by copy+delete
fn safe_move(source: &Path, target: &Path) -> Result<(), AppError> {
    // Try rename first (same device)
    match fs::rename(source, target) {
        Ok(()) => Ok(()),
        Err(_) => {
            // Cross-device: copy then delete
            if source.is_dir() {
                copy_dir_recursive(source, target)?;
            } else {
                if let Some(parent) = target.parent() {
                    fs::create_dir_all(parent)?;
                }
                fs::copy(source, target)?;
            }

            // Verify the copy succeeded before deleting source
            if target.exists() {
                if source.is_dir() {
                    fs::remove_dir_all(source)?;
                } else {
                    fs::remove_file(source)?;
                }
                Ok(())
            } else {
                Err(AppError::General(
                    "Copy verification failed — source was not deleted".to_string(),
                ))
            }
        }
    }
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), AppError> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        // Skip symlinks to prevent symlink-following attacks
        if file_type.is_symlink() {
            continue;
        }
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if file_type.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}
