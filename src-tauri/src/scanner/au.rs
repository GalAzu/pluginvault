#![cfg(target_os = "macos")]

use std::path::Path;

use crate::db::models::PluginMetadata;
use crate::utils::errors::AppError;

pub fn extract_au_metadata(path: &Path) -> Result<PluginMetadata, AppError> {
    // Try Info.plist
    if let Some(meta) = try_info_plist(path) {
        return Ok(meta);
    }

    // Fallback to filename
    Ok(PluginMetadata {
        name: super::metadata::name_from_path(path),
        vendor: None,
        version: None,
        category: Some("Effect".to_string()), // default for AU
        subcategory: None,
        file_size_bytes: 0,
        architecture: None,
        hash: String::new(),
        install_date: None,
    })
}

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

    // Extract vendor from bundle identifier
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

    // Parse AudioComponents for type info
    let mut category = None;
    let mut subcategory = None;
    if let Some(components) = dict.get("AudioComponents").and_then(|v| v.as_array()) {
        for component in components {
            if let Some(comp_dict) = component.as_dictionary() {
                // Map AU type to category
                if let Some(au_type) = comp_dict.get("type").and_then(|v| v.as_string()) {
                    category = Some(match au_type {
                        "aumu" => "Instrument".to_string(),
                        "aufx" => "Effect".to_string(),
                        "aumf" => "Effect".to_string(), // MIDI-controlled effect
                        "aumi" => "MIDI Processor".to_string(),
                        "augn" => "Generator".to_string(),
                        _ => "Effect".to_string(),
                    });
                }

                // Use description as subcategory hint
                if let Some(desc) = comp_dict.get("description").and_then(|v| v.as_string()) {
                    subcategory = categorize_from_description(desc);
                }

                // Use name from AudioComponent if main name is empty
                if name.is_empty() {
                    if let Some(comp_name) = comp_dict.get("name").and_then(|v| v.as_string()) {
                        let final_name = comp_name.to_string();
                        return Some(PluginMetadata {
                            name: final_name,
                            vendor: vendor.clone(),
                            version: version.clone(),
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
        }
    }

    let final_name = if name.is_empty() {
        super::metadata::name_from_path(path)
    } else {
        name
    };

    Some(PluginMetadata {
        name: final_name,
        vendor,
        version,
        category,
        subcategory,
        file_size_bytes: 0,
        architecture: None,
        hash: String::new(),
        install_date: None,
    })
}

fn categorize_from_description(desc: &str) -> Option<String> {
    let lower = desc.to_lowercase();
    if lower.contains("reverb") {
        Some("Reverb".to_string())
    } else if lower.contains("delay") {
        Some("Delay".to_string())
    } else if lower.contains("compressor") || lower.contains("comp") {
        Some("Compressor".to_string())
    } else if lower.contains("equalizer") || lower.contains(" eq") {
        Some("EQ".to_string())
    } else if lower.contains("synth") {
        Some("Synthesizer".to_string())
    } else if lower.contains("distortion") || lower.contains("saturation") {
        Some("Distortion".to_string())
    } else {
        None
    }
}

fn capitalize_first(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(c) => c.to_uppercase().to_string() + chars.as_str(),
    }
}
