use rusqlite::Connection;
use std::path::Path;
use std::sync::{Mutex, MutexGuard};

use crate::utils::errors::AppError;

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(data_dir: &Path) -> Result<Self, AppError> {
        let db_path = data_dir.join("pluginvault.db");
        let conn = Connection::open(&db_path)?;

        // Enable WAL mode for better concurrent read performance
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;
        conn.execute_batch("PRAGMA foreign_keys=ON;")?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn run_migrations(&self) -> Result<(), AppError> {
        let conn = self.conn();
        let migration_sql = include_str!("migrations/v001_initial.sql");
        conn.execute_batch(migration_sql)?;
        Ok(())
    }

    pub fn conn(&self) -> MutexGuard<'_, Connection> {
        self.conn.lock().expect("Database mutex poisoned")
    }
}
