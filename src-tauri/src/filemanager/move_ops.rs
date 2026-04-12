use std::path::{Path, PathBuf};

use crate::db::models::{Plugin, ToggleResult};
use crate::utils::errors::AppError;

/// Move a plugin file/bundle to a new parent directory.
///
/// Safety guarantees:
/// - Source is canonicalized to defeat symlink redirection
/// - Source must exist
/// - Destination directory is created if missing
/// - Destination file/bundle path must NOT already exist (no silent overwrite)
/// - Move uses `safe_move_public` which falls back to copy+delete for
///   cross-device transfers
pub fn move_plugin_to(plugin: &Plugin, dest_dir: &Path) -> Result<ToggleResult, AppError> {
    let source = PathBuf::from(&plugin.file_path);
    if !source.exists() {
        return Err(AppError::General(format!(
            "Source does not exist: {}",
            source.display()
        )));
    }
    let source = source
        .canonicalize()
        .map_err(|e| AppError::General(format!("Failed to resolve source: {}", e)))?;

    super::permissions::check_write_permission(&source)?;

    // Create destination directory if needed
    std::fs::create_dir_all(dest_dir).map_err(AppError::Io)?;

    let file_name = source
        .file_name()
        .ok_or_else(|| AppError::General("Invalid file name".to_string()))?;
    let target = dest_dir.join(file_name);

    if target.exists() {
        return Err(AppError::General(format!(
            "Destination already exists: {}",
            target.display()
        )));
    }

    super::toggle::safe_move_public(&source, &target)?;

    Ok(ToggleResult {
        success: true,
        original_path: source.to_string_lossy().to_string(),
        target_path: target.to_string_lossy().to_string(),
        method: "move".to_string(),
    })
}
