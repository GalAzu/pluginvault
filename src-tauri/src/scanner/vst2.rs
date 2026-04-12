use std::path::Path;

use crate::db::models::PluginMetadata;
use crate::utils::errors::AppError;

pub fn extract_vst2_metadata(path: &Path) -> Result<PluginMetadata, AppError> {
    // On macOS, VST2 can be a .vst bundle with Info.plist
    #[cfg(target_os = "macos")]
    if path.is_dir() {
        if let Some(meta) = try_info_plist(path) {
            return Ok(meta);
        }
    }

    // Fallback to filename-based extraction
    let name = super::metadata::name_from_path(path);

    Ok(PluginMetadata {
        name,
        vendor: None,
        version: None,
        category: None,
        subcategory: None,
        file_size_bytes: 0,
        architecture: detect_architecture(path),
        hash: String::new(),
        install_date: None,
    })
}

#[cfg(target_os = "macos")]
fn try_info_plist(path: &Path) -> Option<PluginMetadata> {
    let plist_path = path.join("Contents/Info.plist");
    if !plist_path.exists() {
        return None;
    }

    let value: plist::Value = plist::Value::from_file(&plist_path).ok()?;
    let dict = value.as_dictionary()?;

    let name = dict
        .get("CFBundleName")
        .and_then(|v| v.as_string())
        .unwrap_or("")
        .to_string();

    let version = dict
        .get("CFBundleShortVersionString")
        .or_else(|| dict.get("CFBundleVersion"))
        .and_then(|v| v.as_string())
        .map(|s| s.to_string());

    let vendor = dict
        .get("CFBundleIdentifier")
        .and_then(|v| v.as_string())
        .and_then(|id| {
            let parts: Vec<&str> = id.split('.').collect();
            if parts.len() >= 2 {
                let v = parts[1];
                let mut chars = v.chars();
                Some(match chars.next() {
                    None => String::new(),
                    Some(c) => c.to_uppercase().to_string() + chars.as_str(),
                })
            } else {
                None
            }
        });

    let final_name = if name.is_empty() {
        super::metadata::name_from_path(path)
    } else {
        name
    };

    Some(PluginMetadata {
        name: final_name,
        vendor,
        version,
        category: None,
        subcategory: None,
        file_size_bytes: 0,
        architecture: None,
        hash: String::new(),
        install_date: None,
    })
}

fn detect_architecture(path: &Path) -> Option<String> {
    let name = path.file_name()?.to_string_lossy().to_lowercase();
    if name.contains("x64") || name.contains("64bit") {
        Some("x64".to_string())
    } else if name.contains("x86") || name.contains("32bit") {
        Some("x86".to_string())
    } else {
        None
    }
}
