use tauri::State;

use crate::db::connection::Database;
use crate::db::models::{BulkResult, Collection, NewCollection};
use crate::db::queries;

#[tauri::command]
pub fn get_collections(db: State<'_, Database>) -> Result<Vec<Collection>, String> {
    let conn = db.conn();
    queries::get_all_collections(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_collection(
    db: State<'_, Database>,
    name: String,
    description: Option<String>,
    is_smart: Option<bool>,
    smart_filter: Option<String>,
) -> Result<Collection, String> {
    let conn = db.conn();
    let new = NewCollection {
        name,
        description,
        is_smart,
        smart_filter,
    };
    queries::create_collection(&conn, &new).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_collection(db: State<'_, Database>, id: String) -> Result<(), String> {
    let conn = db.conn();
    queries::delete_collection(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_to_collection(
    db: State<'_, Database>,
    collection_id: String,
    plugin_id: String,
) -> Result<(), String> {
    let conn = db.conn();
    queries::add_plugin_to_collection(&conn, &collection_id, &plugin_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_from_collection(
    db: State<'_, Database>,
    collection_id: String,
    plugin_id: String,
) -> Result<(), String> {
    let conn = db.conn();
    queries::remove_plugin_from_collection(&conn, &collection_id, &plugin_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn bulk_add_to_collection(
    db: State<'_, Database>,
    collection_id: String,
    plugin_ids: Vec<String>,
) -> Result<BulkResult, String> {
    let conn = db.conn();
    let mut result = BulkResult::default();
    for id in &plugin_ids {
        match queries::add_plugin_to_collection(&conn, &collection_id, id) {
            Ok(_) => result.succeeded += 1,
            Err(e) => {
                result.failed += 1;
                result.errors.push(format!("{}: {}", id, e));
            }
        }
    }
    Ok(result)
}
