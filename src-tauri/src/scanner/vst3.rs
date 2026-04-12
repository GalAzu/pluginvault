use std::fs;
use std::path::Path;

use crate::db::models::PluginMetadata;
use crate::utils::errors::AppError;

pub fn extract_vst3_metadata(path: &Path) -> Result<PluginMetadata, AppError> {
    // Try moduleinfo.json first (VST3 SDK 3.7.4+)
    if let Some(meta) = try_moduleinfo_json(path) {
        return Ok(meta);
    }

    // Try Info.plist on macOS
    #[cfg(target_os = "macos")]
    if let Some(meta) = try_info_plist(path) {
        return Ok(meta);
    }

    // Fallback to filename
    Ok(PluginMetadata {
        name: super::metadata::name_from_path(path),
        vendor: None,
        version: None,
        category: None,
        subcategory: None,
        file_size_bytes: 0,
        architecture: None,
        hash: String::new(),
        install_date: None,
    })
}

/// Parse moduleinfo.json found in VST3 bundles
fn try_moduleinfo_json(path: &Path) -> Option<PluginMetadata> {
    let candidates = [
        path.join("Contents/Resources/moduleinfo.json"),
        path.join("Contents/moduleinfo.json"),
        path.join("moduleinfo.json"),
    ];

    for candidate in &candidates {
        if let Ok(data) = fs::read_to_string(candidate) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&data) {
                let name = json
                    .get("Name")
                    .or_else(|| json.get("name"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                let vendor = json
                    .get("Vendor")
                    .or_else(|| json.get("vendor"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());

                let version = json
                    .get("Version")
                    .or_else(|| json.get("version"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());

                // Parse classes for category info
                let mut category = None;
                let mut subcategory = None;
                if let Some(classes) = json.get("Classes").or_else(|| json.get("classes")) {
                    if let Some(arr) = classes.as_array() {
                        for class in arr {
                            if let Some(sub_cats) = class
                                .get("Sub Categories")
                                .or_else(|| class.get("subCategories"))
                                .and_then(|v| v.as_str())
                            {
                                let cats: Vec<&str> = sub_cats.split('|').collect();
                                if cats.contains(&"Instrument") || cats.contains(&"Synth") {
                                    category = Some("Instrument".to_string());
                                } else if cats.contains(&"Fx") {
                                    category = Some("Effect".to_string());
                                }
                                // First subcategory hint
                                for cat in &cats {
                                    let cat = cat.trim();
                                    match cat {
                                        "Reverb" | "Delay" | "EQ" | "Dynamics" | "Distortion"
                                        | "Modulation" | "Filter" | "Analyzer" | "Mastering"
                                        | "Compressor" | "Limiter" | "Gate" | "Chorus"
                                        | "Flanger" | "Phaser" | "Pitch Shift" | "Spatial" => {
                                            subcategory = Some(cat.to_string());
                                        }
                                        "Synth" | "Sampler" | "Drum" | "Piano" => {
                                            subcategory = Some(cat.to_string());
                                        }
                                        _ => {}
                                    }
                                }
                            }
                        }
                    }
                }

                let final_name = if name.is_empty() {
                    super::metadata::name_from_path(path)
                } else {
                    name
                };

                return Some(PluginMetadata {
                    name: final_name,
                    vendor,
                    version,
                    category,
                    subcategory,
                    file_size_bytes: 0,
                    architecture: None,
                    hash: String::new(),
                    install_date: None,
                });
            }
        }
    }
    None
}

/// Parse Info.plist on macOS for VST3 bundles
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

    // Try to extract vendor from bundle identifier (e.g., com.fabfilter.ProQ3)
    let vendor = dict
        .get("CFBundleIdentifier")
        .and_then(|v| v.as_string())
        .and_then(|id| {
            let parts: Vec<&str> = id.split('.').collect();
            if parts.len() >= 2 {
                Some(capitalize_first(parts[1]))
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

#[cfg(target_os = "macos")]
fn capitalize_first(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(c) => c.to_uppercase().to_string() + chars.as_str(),
    }
}
