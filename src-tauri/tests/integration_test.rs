//! End-to-end integration test covering the full scan → disable → rescan →
//! enable → undo flow using only low-level modules (no Tauri runtime).
//!
//! What this actually exercises:
//!   1. Scanner discovers a real on-disk VST3 bundle
//!   2. Metadata extraction + hashing works on the bundle
//!   3. upsert_plugin persists the plugin row
//!   4. filemanager::toggle::disable_plugin physically moves the bundle
//!   5. A second scan does NOT re-discover the disabled bundle (exclusion check)
//!   6. filemanager::toggle::enable_plugin restores the bundle to its origin
//!   7. The toggle history journal records the operation so undo can reverse it

use std::fs;
use std::path::PathBuf;

use pluginvault_lib::db::connection::Database;
use pluginvault_lib::db::models::{
    NewPlugin, Plugin, PluginFilter, PluginUpdate, ScanPathConfig,
};
use pluginvault_lib::db::queries;
use pluginvault_lib::filemanager::move_ops as fmmove;
use pluginvault_lib::filemanager::toggle as fmtoggle;
use pluginvault_lib::scanner::{discovery, metadata};

/// Create a fake VST3 bundle at `bundle_path` with a dummy main binary.
/// VST3 bundles on macOS look like:
///   FakePlugin.vst3/
///     Contents/
///       MacOS/
///         FakePlugin  (actual mach-o binary in real life; dummy bytes here)
fn create_fake_vst3(bundle_path: &std::path::Path) {
    let macos = bundle_path.join("Contents").join("MacOS");
    fs::create_dir_all(&macos).expect("create bundle dirs");

    let binary_name = bundle_path
        .file_stem()
        .unwrap()
        .to_string_lossy()
        .to_string();
    let binary_path = macos.join(&binary_name);
    // Non-empty content so the hash is deterministic and non-empty.
    fs::write(&binary_path, b"fake-vst3-binary-bytes-v1").expect("write binary");
}

#[test]
fn full_scan_toggle_undo_flow() {
    // --- 1. Temp environment -------------------------------------------------
    let tmp = tempfile::tempdir().expect("tempdir");
    let root = tmp.path();

    // Scanner root matching a real macOS layout
    let vst3_dir = root.join("Plug-Ins").join("VST3");
    fs::create_dir_all(&vst3_dir).expect("create vst3 dir");

    // Disabled folder placed INSIDE the scan root to exercise the excluded-dir
    // filter in discovery::discover_plugins. A real user's default would be
    // outside the scan root; putting it inside is a stronger test.
    let disabled_folder = vst3_dir.join("PluginVault Disabled");

    // Fake plugin bundle
    let bundle_path = vst3_dir.join("FakePlugin.vst3");
    create_fake_vst3(&bundle_path);
    assert!(bundle_path.exists(), "bundle should exist before scan");
    assert!(
        bundle_path.join("Contents/MacOS/FakePlugin").exists(),
        "bundle binary should exist"
    );

    // --- 2. Database ---------------------------------------------------------
    let db = Database::new(root).expect("open db");
    db.run_migrations().expect("run migrations");

    // Insert a scan path row so the schema exercise is complete. We still
    // invoke discovery directly with a ScanPathConfig — get_scan_paths is
    // round-tripped here purely as a smoke test of the schema.
    {
        let conn = db.conn();
        queries::insert_scan_path(
            &conn,
            vst3_dir.to_str().unwrap(),
            Some("VST3"),
            false,
        )
        .expect("insert scan path");
        let rows = queries::get_scan_paths(&conn).expect("get scan paths");
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].path, vst3_dir.to_str().unwrap());
    }

    // --- 3. First scan -------------------------------------------------------
    let scan_configs = vec![ScanPathConfig {
        path: vst3_dir.to_string_lossy().to_string(),
        format: "VST3".to_string(),
        is_default: false,
    }];

    let discovered = discovery::discover_plugins(&scan_configs, |_| {})
        .expect("discover plugins");
    assert_eq!(
        discovered.len(),
        1,
        "should discover exactly one bundle, got {:?}",
        discovered.iter().map(|d| d.path.display().to_string()).collect::<Vec<_>>()
    );
    assert_eq!(discovered[0].format, "VST3");

    let disc = &discovered[0];
    let meta = metadata::extract_metadata(&disc.path, &disc.format)
        .expect("extract metadata");
    assert_eq!(meta.name, "FakePlugin");
    assert!(!meta.hash.is_empty(), "hash should be computed");
    assert!(meta.file_size_bytes > 0, "file size should be non-zero");

    let file_path_str = disc.path.to_string_lossy().to_string();
    let new_plugin = NewPlugin {
        name: meta.name.clone(),
        vendor: None,
        version: None,
        format: "VST3".to_string(),
        category: None,
        subcategory: None,
        file_path: file_path_str.clone(),
        file_size_bytes: Some(meta.file_size_bytes),
        architecture: None,
        hash: Some(meta.hash.clone()),
        install_date: None,
    };

    {
        let conn = db.conn();
        queries::upsert_plugin(&conn, &new_plugin).expect("upsert plugin");
    }

    // Verify the row made it into the DB
    let plugin_id: String = {
        let conn = db.conn();
        let plugins = queries::get_all_plugins(&conn, &PluginFilter::default())
            .expect("get all plugins");
        assert_eq!(plugins.len(), 1, "exactly one plugin after first scan");
        assert_eq!(plugins[0].file_path, file_path_str);
        assert_eq!(plugins[0].name, "FakePlugin");
        assert!(plugins[0].is_enabled);
        plugins[0].id.clone()
    };

    // --- 4. DISABLE via filemanager -----------------------------------------
    // Re-read the stored Plugin so disable gets the authoritative record.
    let stored_plugin: Plugin = {
        let conn = db.conn();
        queries::get_plugin_by_id(&conn, &plugin_id).expect("get plugin")
    };

    let toggle_result = fmtoggle::disable_plugin(&stored_plugin, &disabled_folder, "move")
        .expect("disable plugin");
    assert!(toggle_result.success);
    assert!(!bundle_path.exists(), "bundle should have been moved away");
    let disabled_bundle = PathBuf::from(&toggle_result.target_path);
    assert!(
        disabled_bundle.exists(),
        "disabled bundle should exist at {}",
        disabled_bundle.display()
    );
    assert!(
        disabled_bundle.starts_with(&disabled_folder),
        "target should be under disabled folder"
    );

    // Mirror what the real disable command does to the DB record.
    {
        let conn = db.conn();
        queries::update_plugin(
            &conn,
            &plugin_id,
            &PluginUpdate {
                is_enabled: Some(false),
                file_path: Some(toggle_result.target_path.clone()),
                original_path: Some(toggle_result.original_path.clone()),
                disabled_path: Some(toggle_result.target_path.clone()),
                ..Default::default()
            },
        )
        .expect("update plugin to disabled");
        // Also record in toggle_history for the undo test below.
        queries::insert_toggle_history(
            &conn,
            &plugin_id,
            "disable",
            &toggle_result.original_path,
            &toggle_result.target_path,
            &toggle_result.method,
        )
        .expect("insert history");
    }

    // Verify the DB reflects the disabled state.
    {
        let conn = db.conn();
        let p = queries::get_plugin_by_id(&conn, &plugin_id).expect("get");
        assert!(!p.is_enabled);
        assert_eq!(p.file_path, toggle_result.target_path);
        assert_eq!(p.disabled_path.as_deref(), Some(toggle_result.target_path.as_str()));
        assert_eq!(p.original_path.as_deref(), Some(toggle_result.original_path.as_str()));
    }

    // --- 5. SECOND SCAN: exclusion check ------------------------------------
    // The disabled bundle now lives inside a "PluginVault Disabled" folder.
    // discovery::discover_plugins must skip that folder entirely — otherwise
    // the disabled plugin gets re-indexed as a fresh plugin with a different
    // file_path (and the user ends up with duplicate rows).
    let discovered2 = discovery::discover_plugins(&scan_configs, |_| {})
        .expect("second discover");
    assert_eq!(
        discovered2.len(),
        0,
        "second scan must not rediscover the disabled bundle, got: {:?}",
        discovered2
            .iter()
            .map(|d| d.path.display().to_string())
            .collect::<Vec<_>>()
    );

    // Simulate the scanner's upsert phase too — upserting a known path
    // shouldn't add a duplicate row either.
    {
        let conn = db.conn();
        let plugins = queries::get_all_plugins(&conn, &PluginFilter::default())
            .expect("get all");
        assert_eq!(
            plugins.len(),
            1,
            "DB must still contain exactly one plugin row after rescan"
        );
    }

    // --- 6. ENABLE via filemanager ------------------------------------------
    let stored_plugin: Plugin = {
        let conn = db.conn();
        queries::get_plugin_by_id(&conn, &plugin_id).expect("get plugin")
    };

    let enable_result = fmtoggle::enable_plugin(&stored_plugin, "move")
        .expect("enable plugin");
    assert!(enable_result.success);
    let restored_path = PathBuf::from(&enable_result.target_path);
    assert!(
        restored_path.exists(),
        "restored bundle should exist at {}",
        restored_path.display()
    );
    assert!(!disabled_bundle.exists(), "disabled bundle should be gone");

    // Mirror the enable command's DB update — including the
    // clear_disabled_path fix (disabled_path must go back to NULL, not "").
    {
        let conn = db.conn();
        queries::update_plugin(
            &conn,
            &plugin_id,
            &PluginUpdate {
                is_enabled: Some(true),
                file_path: Some(enable_result.target_path.clone()),
                clear_disabled_path: true,
                ..Default::default()
            },
        )
        .expect("update plugin to enabled");
        queries::insert_toggle_history(
            &conn,
            &plugin_id,
            "enable",
            &enable_result.original_path,
            &enable_result.target_path,
            &enable_result.method,
        )
        .expect("insert history");
    }

    // Verify disabled_path is NULL (not ""), which was the original bug.
    {
        let conn = db.conn();
        let p = queries::get_plugin_by_id(&conn, &plugin_id).expect("get");
        assert!(p.is_enabled);
        assert_eq!(
            p.disabled_path, None,
            "disabled_path must be NULL after enable, got {:?}",
            p.disabled_path
        );
    }

    // --- 7. UNDO check ------------------------------------------------------
    // Undo should target the most recent un-undone history entry. We just
    // inserted an "enable" entry — undoing it means disabling again.
    let last = {
        let conn = db.conn();
        queries::get_last_toggle(&conn)
            .expect("get last toggle")
            .expect("there should be a toggle to undo")
    };
    assert_eq!(last.action, "enable");
    assert!(!last.undone);

    // Perform the reverse toggle manually to mirror what undo_toggle_entry does.
    let stored_plugin: Plugin = {
        let conn = db.conn();
        queries::get_plugin_by_id(&conn, &plugin_id).expect("get plugin")
    };
    let reverse = fmtoggle::disable_plugin(&stored_plugin, &disabled_folder, "move")
        .expect("reverse toggle");
    assert!(reverse.success);
    assert!(PathBuf::from(&reverse.target_path).exists());

    {
        let conn = db.conn();
        queries::mark_toggle_undone(&conn, &last.id).expect("mark undone");
        let history = queries::get_toggle_history(&conn, 10).expect("history");
        let undone_entry = history
            .iter()
            .find(|e| e.id == last.id)
            .expect("find entry");
        assert!(undone_entry.undone, "entry should be marked undone");
    }

    // Confirm no new undoable entry remains beyond the original disable.
    {
        let conn = db.conn();
        let remaining = queries::get_last_toggle(&conn).expect("get last");
        // The very first "disable" entry is still un-undone, so get_last_toggle
        // should return it (not the newer "enable" we just undid).
        let entry = remaining.expect("first disable should still be undoable");
        assert_eq!(entry.action, "disable");
        assert!(!entry.undone);
    }
}

/// get_stats with zero plugins must not blow up. total - enabled should be 0,
/// and the by_* HashMaps should all be empty rather than erroring.
#[test]
fn get_stats_on_empty_db() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let db = Database::new(tmp.path()).expect("open db");
    db.run_migrations().expect("run migrations");

    let conn = db.conn();
    let stats = queries::get_stats(&conn).expect("get stats on empty db");
    assert_eq!(stats.total, 0);
    assert_eq!(stats.enabled, 0);
    assert_eq!(stats.disabled, 0);
    assert!(stats.by_format.is_empty());
    assert!(stats.by_category.is_empty());
    assert!(stats.by_vendor.is_empty());
}

/// Helper: insert a fake VST3 bundle on disk and a matching DB row, returning
/// the fully-loaded Plugin so move/delete tests can act on it.
fn seed_plugin(
    db: &Database,
    bundle_path: &std::path::Path,
    vendor: Option<&str>,
) -> Plugin {
    create_fake_vst3(bundle_path);
    let conn = db.conn();
    queries::upsert_plugin(
        &conn,
        &NewPlugin {
            name: bundle_path.file_stem().unwrap().to_string_lossy().to_string(),
            vendor: vendor.map(|s| s.to_string()),
            version: None,
            format: "VST3".to_string(),
            category: None,
            subcategory: None,
            file_path: bundle_path.to_string_lossy().to_string(),
            file_size_bytes: Some(24),
            architecture: None,
            hash: Some(format!("hash-{}", bundle_path.display())),
            install_date: None,
        },
    )
    .expect("upsert seed plugin");
    let plugins = queries::get_all_plugins(&conn, &PluginFilter::default())
        .expect("get all");
    plugins
        .into_iter()
        .find(|p| p.file_path == bundle_path.to_string_lossy())
        .expect("seeded plugin not found in DB")
}

#[test]
fn move_plugin_to_custom_location() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let root = tmp.path();
    let src_dir = root.join("Plug-Ins").join("VST3");
    fs::create_dir_all(&src_dir).expect("mkdir src");

    let db = Database::new(root).expect("open db");
    db.run_migrations().expect("migrations");

    let bundle_path = src_dir.join("MovableFx.vst3");
    let plugin = seed_plugin(&db, &bundle_path, Some("Acme Audio"));
    assert!(bundle_path.exists());

    let dest_dir = root.join("MovedPlugins");
    let result = fmmove::move_plugin_to(&plugin, &dest_dir).expect("move plugin");
    assert!(result.success);

    let moved = PathBuf::from(&result.target_path);
    assert!(moved.exists(), "moved bundle should exist at {}", moved.display());
    assert!(!bundle_path.exists(), "source should no longer exist");
    assert!(
        moved.starts_with(&dest_dir),
        "target must be under dest_dir, got {}",
        moved.display()
    );

    // Mirror the command-layer DB update
    {
        let conn = db.conn();
        queries::update_plugin(
            &conn,
            &plugin.id,
            &PluginUpdate {
                file_path: Some(result.target_path.clone()),
                ..Default::default()
            },
        )
        .expect("update file_path");
        let p = queries::get_plugin_by_id(&conn, &plugin.id).expect("get");
        assert_eq!(p.file_path, result.target_path);
    }
}

#[test]
fn auto_organize_by_vendor_creates_subfolders() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let root = tmp.path();
    let src_dir = root.join("Plug-Ins").join("VST3");
    fs::create_dir_all(&src_dir).expect("mkdir src");

    let db = Database::new(root).expect("open db");
    db.run_migrations().expect("migrations");

    // Two plugins with different vendors
    let bundle_a = src_dir.join("AlphaPlug.vst3");
    let bundle_b = src_dir.join("BetaPlug.vst3");
    let plugin_a = seed_plugin(&db, &bundle_a, Some("Vendor1"));
    let plugin_b = seed_plugin(&db, &bundle_b, Some("Vendor2"));

    let base = root.join("Organized");
    fs::create_dir_all(&base).expect("mkdir base");

    // Mirror what auto_organize_by_vendor does, plugin-by-plugin, since the
    // Tauri command requires a State<Database>. The move_ops layer is what
    // actually moves bytes — that's the part worth exercising end-to-end.
    for plugin in [&plugin_a, &plugin_b] {
        let safe_vendor: String = plugin
            .vendor
            .as_deref()
            .unwrap_or("Unknown")
            .chars()
            .map(|c| {
                if c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' || c == '&' {
                    c
                } else {
                    '_'
                }
            })
            .collect();
        let vendor_dir = base.join(&safe_vendor);
        let result = fmmove::move_plugin_to(plugin, &vendor_dir).expect("move plugin");
        // Update DB so subsequent ops would see the new path (matches command layer)
        let conn = db.conn();
        queries::update_plugin(
            &conn,
            &plugin.id,
            &PluginUpdate {
                file_path: Some(result.target_path.clone()),
                ..Default::default()
            },
        )
        .expect("update file_path");
    }

    let v1 = base.join("Vendor1").join("AlphaPlug.vst3");
    let v2 = base.join("Vendor2").join("BetaPlug.vst3");
    assert!(v1.exists(), "Vendor1/AlphaPlug.vst3 should exist at {}", v1.display());
    assert!(v2.exists(), "Vendor2/BetaPlug.vst3 should exist at {}", v2.display());
    assert!(!bundle_a.exists());
    assert!(!bundle_b.exists());
}

#[test]
fn delete_plugin_permanent_removes_file() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let root = tmp.path();
    let src_dir = root.join("Plug-Ins").join("VST3");
    fs::create_dir_all(&src_dir).expect("mkdir src");

    let db = Database::new(root).expect("open db");
    db.run_migrations().expect("migrations");

    let bundle_path = src_dir.join("Doomed.vst3");
    let plugin = seed_plugin(&db, &bundle_path, None);
    assert!(bundle_path.exists());

    // Mirror delete_plugin_permanent(delete_file=true)
    let canonical = bundle_path.canonicalize().expect("canonicalize");
    if canonical.is_dir() {
        fs::remove_dir_all(&canonical).expect("rm bundle");
    } else {
        fs::remove_file(&canonical).expect("rm file");
    }
    {
        let conn = db.conn();
        queries::delete_plugin(&conn, &plugin.id).expect("delete row");
    }

    assert!(!bundle_path.exists(), "file should be gone from disk");
    {
        let conn = db.conn();
        let res = queries::get_plugin_by_id(&conn, &plugin.id);
        assert!(res.is_err(), "plugin row should be gone from DB");
    }
}

#[test]
fn delete_plugin_permanent_preserves_file() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let root = tmp.path();
    let src_dir = root.join("Plug-Ins").join("VST3");
    fs::create_dir_all(&src_dir).expect("mkdir src");

    let db = Database::new(root).expect("open db");
    db.run_migrations().expect("migrations");

    let bundle_path = src_dir.join("Survivor.vst3");
    let plugin = seed_plugin(&db, &bundle_path, None);
    assert!(bundle_path.exists());

    // Mirror delete_plugin_permanent(delete_file=false): only remove DB row.
    {
        let conn = db.conn();
        queries::delete_plugin(&conn, &plugin.id).expect("delete row");
    }

    assert!(bundle_path.exists(), "file must still exist on disk");
    {
        let conn = db.conn();
        let res = queries::get_plugin_by_id(&conn, &plugin.id);
        assert!(res.is_err(), "plugin row should be gone from DB");
    }
}

/// Searching when nothing matches must return an empty Vec, not an error.
#[test]
fn search_with_no_results() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let db = Database::new(tmp.path()).expect("open db");
    db.run_migrations().expect("run migrations");

    let conn = db.conn();
    let filter = PluginFilter {
        search: Some("thisstringshouldnotmatchanything".to_string()),
        ..Default::default()
    };
    let results = queries::get_all_plugins(&conn, &filter).expect("search no-op");
    assert!(results.is_empty());

    // Also verify the FTS-stripping path: search containing only punctuation
    // should degrade to no-op filter, not error.
    let filter_punct = PluginFilter {
        search: Some("!!!---".to_string()),
        ..Default::default()
    };
    let results_punct = queries::get_all_plugins(&conn, &filter_punct)
        .expect("punctuation-only search");
    assert!(results_punct.is_empty());
}
