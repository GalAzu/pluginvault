use tauri::State;

use crate::db::connection::Database;
use crate::db::models::Tag;
use crate::db::queries;

#[tauri::command]
pub fn get_tags(db: State<'_, Database>) -> Result<Vec<Tag>, String> {
    let conn = db.conn();
    queries::get_all_tags(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_tag(
    db: State<'_, Database>,
    name: String,
    color: Option<String>,
) -> Result<Tag, String> {
    let conn = db.conn();
    queries::create_tag(&conn, &name, color.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_tag(db: State<'_, Database>, id: String) -> Result<(), String> {
    let conn = db.conn();
    queries::delete_tag(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn tag_plugin(
    db: State<'_, Database>,
    plugin_id: String,
    tag_id: String,
) -> Result<(), String> {
    let conn = db.conn();
    queries::add_tag_to_plugin(&conn, &plugin_id, &tag_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn untag_plugin(
    db: State<'_, Database>,
    plugin_id: String,
    tag_id: String,
) -> Result<(), String> {
    let conn = db.conn();
    queries::remove_tag_from_plugin(&conn, &plugin_id, &tag_id).map_err(|e| e.to_string())
}
