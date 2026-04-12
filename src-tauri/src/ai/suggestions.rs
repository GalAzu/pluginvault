use std::collections::HashMap;

use crate::db::models::{CleanupSuggestion, Plugin};

/// Analyze plugins and suggest cleanup actions
pub fn suggest_cleanup(plugins: &[Plugin]) -> Vec<CleanupSuggestion> {
    let mut suggestions: Vec<CleanupSuggestion> = Vec::new();

    // 1. Old VST2 versions where VST3 exists
    suggestions.extend(find_obsolete_vst2(plugins));

    // 2. Multiple versions of same plugin
    suggestions.extend(find_version_duplicates(plugins));

    // 3. Plugins not modified in 3+ years
    suggestions.extend(find_stale_plugins(plugins));

    // 4. Plugins in non-standard locations
    suggestions.extend(find_non_standard_locations(plugins));

    suggestions
}

fn find_obsolete_vst2(plugins: &[Plugin]) -> Vec<CleanupSuggestion> {
    let mut suggestions = Vec::new();

    // Group by normalized name + vendor
    let mut by_name: HashMap<String, Vec<&Plugin>> = HashMap::new();
    for plugin in plugins {
        let key = format!(
            "{}:{}",
            plugin.vendor.as_deref().unwrap_or("").to_lowercase(),
            plugin.name.to_lowercase().replace(|c: char| !c.is_alphanumeric(), "")
        );
        by_name.entry(key).or_default().push(plugin);
    }

    for (_key, group) in &by_name {
        let has_vst3 = group.iter().any(|p| p.format == "VST3");
        let vst2_plugins: Vec<&&Plugin> = group.iter().filter(|p| p.format == "VST2").collect();

        if has_vst3 && !vst2_plugins.is_empty() {
            for vst2 in vst2_plugins {
                suggestions.push(CleanupSuggestion {
                    plugin_id: vst2.id.clone(),
                    plugin_name: vst2.name.clone(),
                    reason: format!(
                        "VST2 version exists but VST3 is also installed. VST3 is preferred for better compatibility and features."
                    ),
                    suggestion_type: "obsolete_format".to_string(),
                    severity: "low".to_string(),
                    related_plugin_id: group
                        .iter()
                        .find(|p| p.format == "VST3")
                        .map(|p| p.id.clone()),
                });
            }
        }
    }

    suggestions
}

fn find_version_duplicates(plugins: &[Plugin]) -> Vec<CleanupSuggestion> {
    let mut suggestions = Vec::new();

    // Group by name + vendor + format
    let mut by_key: HashMap<String, Vec<&Plugin>> = HashMap::new();
    for plugin in plugins {
        let key = format!(
            "{}:{}:{}",
            plugin.vendor.as_deref().unwrap_or("").to_lowercase(),
            plugin.name.to_lowercase(),
            plugin.format
        );
        by_key.entry(key).or_default().push(plugin);
    }

    for (_key, group) in &by_key {
        if group.len() <= 1 {
            continue;
        }

        // Sort by version descending
        let mut sorted = group.clone();
        sorted.sort_by(|a, b| {
            let va = a.version.as_deref().unwrap_or("0");
            let vb = b.version.as_deref().unwrap_or("0");
            compare_versions(vb, va)
        });

        // Suggest removing all but the newest
        for old in sorted.iter().skip(1) {
            suggestions.push(CleanupSuggestion {
                plugin_id: old.id.clone(),
                plugin_name: old.name.clone(),
                reason: format!(
                    "Older version ({}). Newer version ({}) is available.",
                    old.version.as_deref().unwrap_or("unknown"),
                    sorted[0].version.as_deref().unwrap_or("unknown")
                ),
                suggestion_type: "old_version".to_string(),
                severity: "medium".to_string(),
                related_plugin_id: Some(sorted[0].id.clone()),
            });
        }
    }

    suggestions
}

fn find_stale_plugins(plugins: &[Plugin]) -> Vec<CleanupSuggestion> {
    let mut suggestions = Vec::new();
    let three_years_ago = chrono::Utc::now() - chrono::Duration::days(3 * 365);
    let cutoff = three_years_ago.format("%Y-%m-%d").to_string();

    for plugin in plugins {
        if let Some(ref install_date) = plugin.install_date {
            if install_date < &cutoff {
                suggestions.push(CleanupSuggestion {
                    plugin_id: plugin.id.clone(),
                    plugin_name: plugin.name.clone(),
                    reason: format!(
                        "Plugin file dates from {} — over 3 years old. May be abandoned or superseded.",
                        install_date
                    ),
                    suggestion_type: "stale".to_string(),
                    severity: "low".to_string(),
                    related_plugin_id: None,
                });
            }
        }
    }

    suggestions
}

fn find_non_standard_locations(plugins: &[Plugin]) -> Vec<CleanupSuggestion> {
    let mut suggestions = Vec::new();

    let standard_paths_mac = [
        "/Library/Audio/Plug-Ins/",
        "/Library/Application Support/Avid/Audio/Plug-Ins",
    ];

    let standard_paths_win = [
        r"C:\Program Files\Common Files\VST3",
        r"C:\Program Files\VSTPlugins",
        r"C:\Program Files\Steinberg\VSTPlugins",
        r"C:\Program Files\Common Files\VST2",
        r"C:\Program Files\Common Files\Avid\Audio\Plug-Ins",
        r"C:\Program Files\Common Files\CLAP",
    ];

    for plugin in plugins {
        let path = &plugin.file_path;
        let in_standard = if cfg!(target_os = "macos") {
            standard_paths_mac.iter().any(|sp| path.contains(sp))
                || path.contains("/Library/Audio/Plug-Ins/")
        } else {
            standard_paths_win.iter().any(|sp| path.starts_with(sp))
        };

        if !in_standard && !path.contains("disabled") {
            suggestions.push(CleanupSuggestion {
                plugin_id: plugin.id.clone(),
                plugin_name: plugin.name.clone(),
                reason: format!(
                    "Plugin is in a non-standard location: {}. Consider moving to the standard {} folder.",
                    path, plugin.format
                ),
                suggestion_type: "non_standard_location".to_string(),
                severity: "low".to_string(),
                related_plugin_id: None,
            });
        }
    }

    suggestions
}

fn compare_versions(a: &str, b: &str) -> std::cmp::Ordering {
    let parse = |s: &str| -> Vec<u64> {
        s.split(|c: char| !c.is_ascii_digit())
            .filter(|p| !p.is_empty())
            .filter_map(|p| p.parse().ok())
            .collect()
    };

    let pa = parse(a);
    let pb = parse(b);

    for (a, b) in pa.iter().zip(pb.iter()) {
        match a.cmp(b) {
            std::cmp::Ordering::Equal => continue,
            other => return other,
        }
    }
    pa.len().cmp(&pb.len())
}
