use std::collections::{HashMap, HashSet};

use crate::db::models::{DuplicateGroup, DuplicateMember, Plugin};

/// Detect duplicate plugins by hash and by normalized name+vendor.
/// A plugin will appear in at most one group — hash-based grouping wins.
pub fn detect_duplicates(plugins: &[Plugin]) -> Vec<DuplicateGroup> {
    let mut groups: Vec<DuplicateGroup> = Vec::new();
    let mut already_grouped: HashSet<String> = HashSet::new();

    // 1. Exact binary duplicates (same hash)
    let mut by_hash: HashMap<String, Vec<&Plugin>> = HashMap::new();
    for plugin in plugins {
        if let Some(ref hash) = plugin.hash {
            if !hash.is_empty() {
                by_hash.entry(hash.clone()).or_default().push(plugin);
            }
        }
    }
    for (hash, dupes) in &by_hash {
        if dupes.len() > 1 {
            for p in dupes {
                already_grouped.insert(p.id.clone());
            }
            groups.push(DuplicateGroup {
                reason: format!("Exact binary match (hash: {}...)", &hash[..12.min(hash.len())]),
                members: dupes.iter().map(|p| to_member(p)).collect(),
                recommendation: "These are identical binaries. Keep one, remove the rest.".to_string(),
            });
        }
    }

    // 2. Same plugin, different formats or versions (normalized name + vendor)
    //    Skip plugins already matched by the hash pass above.
    let mut by_name: HashMap<String, Vec<&Plugin>> = HashMap::new();
    for plugin in plugins {
        if already_grouped.contains(&plugin.id) {
            continue;
        }
        let key = normalize_name(&plugin.name, &plugin.vendor);
        by_name.entry(key).or_default().push(plugin);
    }
    for (_key, group) in &by_name {
        if group.len() <= 1 {
            continue;
        }

        // Mark all members as grouped
        for p in group {
            already_grouped.insert(p.id.clone());
        }

        // Check if they're different formats of the same plugin
        let formats: Vec<&str> = group.iter().map(|p| p.format.as_str()).collect();
        let unique_formats: HashSet<&str> = formats.iter().cloned().collect();

        if unique_formats.len() > 1 {
            // Different formats — might be intentional
            groups.push(DuplicateGroup {
                reason: format!(
                    "Same plugin in multiple formats: {}",
                    unique_formats.into_iter().collect::<Vec<_>>().join(", ")
                ),
                members: group.iter().map(|p| to_member(p)).collect(),
                recommendation:
                    "Multiple formats of the same plugin. Consider keeping only the format your DAW prefers (VST3 > AU > CLAP > VST2)."
                        .to_string(),
            });
        } else {
            // Same format — likely version duplicates
            let mut sorted: Vec<&&Plugin> = group.iter().collect();
            sorted.sort_by(|a, b| {
                let va = a.version.as_deref().unwrap_or("0");
                let vb = b.version.as_deref().unwrap_or("0");
                version_cmp(vb, va) // descending
            });

            groups.push(DuplicateGroup {
                reason: "Multiple versions of the same plugin".to_string(),
                members: group.iter().map(|p| to_member(p)).collect(),
                recommendation: format!(
                    "Keep the newest version and remove older ones. Newest appears to be: {}",
                    sorted.first().map(|p| p.name.as_str()).unwrap_or("unknown")
                ),
            });
        }
    }

    groups
}

fn to_member(plugin: &Plugin) -> DuplicateMember {
    DuplicateMember {
        id: plugin.id.clone(),
        name: plugin.name.clone(),
        vendor: plugin.vendor.clone(),
        version: plugin.version.clone(),
        format: plugin.format.clone(),
        file_path: plugin.file_path.clone(),
        file_size_bytes: plugin.file_size_bytes,
        hash: plugin.hash.clone(),
    }
}

/// Normalize a plugin name for comparison
fn normalize_name(name: &str, vendor: &Option<String>) -> String {
    let mut normalized = name
        .to_lowercase()
        .replace(|c: char| !c.is_alphanumeric(), "");

    // Remove common suffixes
    for suffix in &["vst3", "vst2", "vst", "au", "aax", "clap", "x64", "x86", "stereo", "mono"] {
        normalized = normalized.replace(suffix, "");
    }

    if let Some(ref v) = vendor {
        format!("{}:{}", v.to_lowercase().replace(|c: char| !c.is_alphanumeric(), ""), normalized)
    } else {
        normalized
    }
}

/// Simple version comparison (handles semver-like strings)
fn version_cmp(a: &str, b: &str) -> std::cmp::Ordering {
    let parse_parts = |s: &str| -> Vec<u64> {
        s.split(|c: char| !c.is_ascii_digit())
            .filter(|p| !p.is_empty())
            .filter_map(|p| p.parse::<u64>().ok())
            .collect()
    };

    let parts_a = parse_parts(a);
    let parts_b = parse_parts(b);

    for (pa, pb) in parts_a.iter().zip(parts_b.iter()) {
        match pa.cmp(pb) {
            std::cmp::Ordering::Equal => continue,
            other => return other,
        }
    }
    parts_a.len().cmp(&parts_b.len())
}
