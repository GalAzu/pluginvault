use rusqlite::Connection;

use crate::db::queries;
use crate::db::models::ToggleHistoryEntry;
use crate::utils::errors::AppError;

/// Record a toggle action in the history journal
pub fn record_toggle(
    conn: &Connection,
    plugin_id: &str,
    action: &str,
    original_path: &str,
    target_path: &str,
    method: &str,
) -> Result<String, AppError> {
    queries::insert_toggle_history(conn, plugin_id, action, original_path, target_path, method)
}

/// Get the last undoable toggle action
pub fn get_last_undoable(conn: &Connection) -> Result<Option<ToggleHistoryEntry>, AppError> {
    queries::get_last_toggle(conn)
}

/// Mark a toggle history entry as undone
pub fn mark_undone(conn: &Connection, id: &str) -> Result<(), AppError> {
    queries::mark_toggle_undone(conn, id)
}
