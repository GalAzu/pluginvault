use std::path::Path;
use walkdir::{DirEntry, WalkDir};

use crate::db::models::{DiscoveredPlugin, ScanPathConfig, ScanProgress};
use crate::utils::errors::AppError;

/// Directory names the scanner must never descend into — these are where
/// PluginVault parks disabled plugins. Walking into them causes disabled
/// plugins to be re-discovered as new enabled plugins.
const EXCLUDED_DIR_NAMES: &[&str] = &[
    "PluginVault Disabled",
    ".pluginvault-disabled",
];

fn is_excluded_dir(entry: &DirEntry) -> bool {
    if !entry.file_type().is_dir() {
        return false;
    }
    match entry.file_name().to_str() {
        Some(name) => EXCLUDED_DIR_NAMES.iter().any(|ex| name.eq_ignore_ascii_case(ex)),
        None => false,
    }
}

/// Walk all configured paths and discover plugin files by extension
pub fn discover_plugins(
    paths: &[ScanPathConfig],
    progress_callback: impl Fn(ScanProgress),
) -> Result<Vec<DiscoveredPlugin>, AppError> {
    let mut discovered: Vec<DiscoveredPlugin> = Vec::new();
    let mut dirs_scanned: u32 = 0;

    for scan_path in paths {
        let root = Path::new(&scan_path.path);
        if !root.exists() {
            continue;
        }

        progress_callback(ScanProgress {
            current_path: scan_path.path.clone(),
            plugins_found: discovered.len() as u32,
            directories_scanned: dirs_scanned,
            phase: "scanning".to_string(),
        });

        let walker = WalkDir::new(root)
            .follow_links(true)
            .max_depth(15)
            .into_iter()
            .filter_entry(|e| {
                // Skip the disabled folder entirely — don't descend into it.
                if is_excluded_dir(e) {
                    return false;
                }
                // Skip hidden dirs (but allow hidden files — the inner loop
                // still filters on file_name.starts_with('.')).
                if e.file_type().is_dir() {
                    if let Some(name) = e.file_name().to_str() {
                        if name.starts_with('.') && e.depth() > 0 {
                            return false;
                        }
                    }
                }
                true
            });

        for entry in walker {
            let entry = match entry {
                Ok(e) => e,
                Err(_) => continue,
            };

            let path = entry.path();
            let file_name = match path.file_name() {
                Some(n) => n.to_string_lossy(),
                None => continue,
            };

            // Skip hidden files
            if file_name.starts_with('.') {
                continue;
            }

            // Defence-in-depth: also skip any entry whose path contains an
            // excluded component (e.g. if a disabled folder has a non-standard name).
            if path.components().any(|c| {
                c.as_os_str()
                    .to_str()
                    .map(|s| EXCLUDED_DIR_NAMES.iter().any(|ex| s.eq_ignore_ascii_case(ex)))
                    .unwrap_or(false)
            }) {
                continue;
            }

            if entry.file_type().is_dir() {
                dirs_scanned += 1;

                // Check if this directory IS a plugin bundle
                if let Some(format) = detect_bundle_format(path, &scan_path.format) {
                    discovered.push(DiscoveredPlugin {
                        path: path.to_path_buf(),
                        format,
                    });
                    // Don't recurse into plugin bundles — WalkDir will handle
                    // the Contents/ inside, but we skip individual files
                }
                continue;
            }

            // Regular file — check extension
            if let Some(format) = detect_file_format(path, &scan_path.format) {
                // Skip files inside a bundle we already discovered
                if !is_inside_bundle(path) {
                    discovered.push(DiscoveredPlugin {
                        path: path.to_path_buf(),
                        format,
                    });
                }
            }
        }

        progress_callback(ScanProgress {
            current_path: scan_path.path.clone(),
            plugins_found: discovered.len() as u32,
            directories_scanned: dirs_scanned,
            phase: "scanning".to_string(),
        });
    }

    Ok(discovered)
}

/// Detect if a directory is a plugin bundle based on extension
fn detect_bundle_format(path: &Path, _scan_format: &str) -> Option<String> {
    let ext = path.extension()?.to_str()?.to_lowercase();
    match ext.as_str() {
        "vst3" => {
            // VST3 bundles have a Contents/ directory
            if path.join("Contents").exists() {
                Some("VST3".to_string())
            } else {
                Some("VST3".to_string()) // Some VST3s are flat directories
            }
        }
        "component" => Some("AU".to_string()),
        "vst" if cfg!(target_os = "macos") => Some("VST2".to_string()),
        "aaxplugin" => Some("AAX".to_string()),
        "clap" if path.is_dir() => Some("CLAP".to_string()),
        _ => None,
    }
}

/// Detect plugin format from a regular file's extension
fn detect_file_format(path: &Path, scan_format: &str) -> Option<String> {
    let ext = path.extension()?.to_str()?.to_lowercase();
    match ext.as_str() {
        "dll" if scan_format == "VST2" || scan_format == "VST3" => {
            // On Windows, .dll in VST2 paths = VST2
            Some(scan_format.to_string())
        }
        "clap" if !path.is_dir() => Some("CLAP".to_string()),
        "vst3" if !path.is_dir() => Some("VST3".to_string()),
        _ => None,
    }
}

/// Check if a path is inside a known plugin bundle (e.g., inside .vst3/Contents/)
fn is_inside_bundle(path: &Path) -> bool {
    for ancestor in path.ancestors().skip(1) {
        if let Some(ext) = ancestor.extension() {
            let ext_str = ext.to_string_lossy().to_lowercase();
            match ext_str.as_ref() {
                "vst3" | "component" | "vst" | "aaxplugin" => return true,
                _ => {}
            }
        }
    }
    false
}
