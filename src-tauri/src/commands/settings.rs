use std::collections::HashMap;
use tauri::State;

use crate::db::connection::Database;
use crate::db::models::Settings;
use crate::db::queries;

#[tauri::command]
pub fn get_settings(db: State<'_, Database>) -> Result<Settings, String> {
    let conn = db.conn();
    queries::get_all_settings(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_settings(
    db: State<'_, Database>,
    settings: HashMap<String, String>,
) -> Result<(), String> {
    let conn = db.conn();
    for (key, value) in &settings {
        queries::set_setting(&conn, key, value).map_err(|e| e.to_string())?;
    }
    Ok(())
}
