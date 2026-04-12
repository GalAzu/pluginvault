use std::fs::{self, File};
use std::io;
use std::path::Path;
use sha2::{Sha256, Digest};

use crate::db::models::PluginMetadata;
use crate::utils::errors::AppError;

/// Extract metadata from a discovered plugin, dispatching to format-specific extractors
pub fn extract_metadata(path: &Path, format: &str) -> Result<PluginMetadata, AppError> {
    extract_metadata_cached(path, format, None)
}

/// Extract metadata, reusing a previously computed hash if `cached_hash_for_size`
/// matches the current file size on disk. This lets repeat scans skip the
/// expensive SHA-256 pass for unchanged binaries.
pub fn extract_metadata_cached(
    path: &Path,
    format: &str,
    cached_hash_for_size: Option<(i64, &str)>,
) -> Result<PluginMetadata, AppError> {
    // Try format-specific extraction first, then fall back to generic
    let mut metadata = match format {
        "VST3" => super::vst3::extract_vst3_metadata(path).unwrap_or_else(|_| generic_metadata(path)),
        #[cfg(target_os = "macos")]
        "AU" => super::au::extract_au_metadata(path).unwrap_or_else(|_| generic_metadata(path)),
        "VST2" => super::vst2::extract_vst2_metadata(path).unwrap_or_else(|_| generic_metadata(path)),
        "AAX" => super::aax::extract_aax_metadata(path).unwrap_or_else(|_| generic_metadata(path)),
        "CLAP" => super::clap::extract_clap_metadata(path).unwrap_or_else(|_| generic_metadata(path)),
        _ => generic_metadata(path),
    };

    // Compute file size first so we can decide whether to reuse the cached hash.
    if metadata.file_size_bytes == 0 {
        metadata.file_size_bytes = get_size(path);
    }

    // Compute or reuse hash of the main binary
    if metadata.hash.is_empty() {
        let can_reuse = match cached_hash_for_size {
            Some((cached_size, cached_hash)) => {
                cached_size == metadata.file_size_bytes && !cached_hash.is_empty()
            }
            None => false,
        };
        if can_reuse {
            metadata.hash = cached_hash_for_size.unwrap().1.to_string();
        } else {
            metadata.hash = compute_hash(path).unwrap_or_default();
        }
    }

    // Get install date from filesystem
    if metadata.install_date.is_none() {
        metadata.install_date = get_created_date(path);
    }

    Ok(metadata)
}

fn generic_metadata(path: &Path) -> PluginMetadata {
    PluginMetadata {
        name: name_from_path(path),
        vendor: None,
        version: None,
        category: None,
        subcategory: None,
        file_size_bytes: get_size(path),
        architecture: None,
        hash: String::new(),
        install_date: get_created_date(path),
    }
}

/// Derive a clean plugin name from the file/bundle path
pub fn name_from_path(path: &Path) -> String {
    let stem = path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "Unknown Plugin".to_string());
    // Clean up common suffixes
    stem.trim_end_matches(" x64")
        .trim_end_matches(" x86")
        .trim_end_matches("_x64")
        .trim_end_matches("_x86")
        .trim()
        .to_string()
}

/// Compute SHA-256 hash of a file or the main binary inside a bundle.
/// Streams the file through the hasher so multi-GB binaries (Kontakt etc.)
/// don't blow up memory.
pub fn compute_hash(path: &Path) -> Result<String, AppError> {
    let binary_path = if path.is_dir() {
        find_main_binary(path)
    } else {
        Some(path.to_path_buf())
    };

    let binary_path = binary_path.ok_or_else(|| AppError::Scanner("No binary found".to_string()))?;
    let mut file = File::open(&binary_path).map_err(AppError::Io)?;
    let mut hasher = Sha256::new();
    io::copy(&mut file, &mut hasher).map_err(AppError::Io)?;
    Ok(format!("{:x}", hasher.finalize()))
}

/// Find the main binary inside a plugin bundle
fn find_main_binary(bundle_path: &Path) -> Option<std::path::PathBuf> {
    // VST3 bundle: Contents/x86_64-linux/, Contents/MacOS/, Contents/x86_64-win/
    let contents = bundle_path.join("Contents");
    if contents.exists() {
        // macOS
        let macos = contents.join("MacOS");
        if macos.exists() {
            if let Ok(entries) = fs::read_dir(&macos) {
                for entry in entries.flatten() {
                    let p = entry.path();
                    if p.is_file() {
                        return Some(p);
                    }
                }
            }
        }
        // Windows
        let win = contents.join("x86_64-win");
        if win.exists() {
            if let Ok(entries) = fs::read_dir(&win) {
                for entry in entries.flatten() {
                    let p = entry.path();
                    if p.extension().map_or(false, |e| e == "vst3") {
                        return Some(p);
                    }
                }
            }
        }
    }
    None
}

fn get_size(path: &Path) -> i64 {
    if path.is_dir() {
        // Sum up all files in the bundle
        walkdir::WalkDir::new(path)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_file())
            .filter_map(|e| e.metadata().ok())
            .map(|m| m.len() as i64)
            .sum()
    } else {
        fs::metadata(path).map(|m| m.len() as i64).unwrap_or(0)
    }
}

fn get_created_date(path: &Path) -> Option<String> {
    let meta = fs::metadata(path).ok()?;
    let created = meta.created().ok()?;
    let dt: chrono::DateTime<chrono::Utc> = created.into();
    Some(dt.format("%Y-%m-%d %H:%M:%S").to_string())
}
