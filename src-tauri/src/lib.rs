pub mod commands;
pub mod db;
pub mod scanner;
pub mod filemanager;
pub mod ai;
pub mod utils;

use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Open devtools in debug builds
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            let data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            std::fs::create_dir_all(&data_dir).expect("Failed to create app data dir");
            let db = db::connection::Database::new(&data_dir).expect("Failed to init database");
            db.run_migrations().expect("Failed to run migrations");
            app.manage(db);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::scan::scan_plugins,
            commands::scan::get_scan_paths,
            commands::scan::add_scan_path,
            commands::scan::remove_scan_path,
            commands::plugins::get_plugins,
            commands::plugins::get_plugin,
            commands::plugins::update_plugin,
            commands::plugins::delete_plugin,
            commands::plugins::get_stats,
            commands::plugins::export_plugins_to_file,
            commands::plugins::reveal_in_file_manager,
            commands::plugins::move_plugin,
            commands::plugins::bulk_move_plugins,
            commands::plugins::auto_organize_by_vendor,
            commands::plugins::delete_plugin_permanent,
            commands::collections::get_collections,
            commands::collections::create_collection,
            commands::collections::delete_collection,
            commands::collections::add_to_collection,
            commands::collections::remove_from_collection,
            commands::collections::bulk_add_to_collection,
            commands::tags::get_tags,
            commands::tags::create_tag,
            commands::tags::delete_tag,
            commands::tags::tag_plugin,
            commands::tags::untag_plugin,
            commands::toggle::enable_plugin,
            commands::toggle::disable_plugin,
            commands::toggle::bulk_enable_plugins,
            commands::toggle::bulk_disable_plugins,
            commands::toggle::undo_last_toggle,
            commands::toggle::undo_toggle_by_id,
            commands::toggle::get_toggle_history,
            commands::ai::auto_categorize,
            commands::ai::detect_duplicates,
            commands::ai::suggest_cleanup,
            commands::settings::get_settings,
            commands::settings::update_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error running PluginVault");
}
