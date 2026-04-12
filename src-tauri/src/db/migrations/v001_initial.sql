-- PluginVault initial schema

CREATE TABLE IF NOT EXISTS plugins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    vendor TEXT,
    version TEXT,
    format TEXT NOT NULL,
    category TEXT,
    subcategory TEXT,
    file_path TEXT NOT NULL UNIQUE,
    file_size_bytes INTEGER,
    architecture TEXT,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    original_path TEXT,
    disabled_path TEXT,
    hash TEXT,
    install_date TEXT,
    last_scanned TEXT,
    first_seen TEXT NOT NULL DEFAULT (datetime('now')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_plugins_name ON plugins(name);
CREATE INDEX IF NOT EXISTS idx_plugins_vendor ON plugins(vendor);
CREATE INDEX IF NOT EXISTS idx_plugins_format ON plugins(format);
CREATE INDEX IF NOT EXISTS idx_plugins_category ON plugins(category);
CREATE INDEX IF NOT EXISTS idx_plugins_is_enabled ON plugins(is_enabled);
CREATE INDEX IF NOT EXISTS idx_plugins_hash ON plugins(hash);

-- Full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS plugins_fts USING fts5(
    name,
    vendor,
    category,
    subcategory,
    notes,
    content='plugins',
    content_rowid='rowid'
);

-- FTS sync triggers
CREATE TRIGGER IF NOT EXISTS plugins_ai AFTER INSERT ON plugins BEGIN
    INSERT INTO plugins_fts(rowid, name, vendor, category, subcategory, notes)
    VALUES (new.rowid, new.name, new.vendor, new.category, new.subcategory, new.notes);
END;

CREATE TRIGGER IF NOT EXISTS plugins_ad AFTER DELETE ON plugins BEGIN
    INSERT INTO plugins_fts(plugins_fts, rowid, name, vendor, category, subcategory, notes)
    VALUES ('delete', old.rowid, old.name, old.vendor, old.category, old.subcategory, old.notes);
END;

CREATE TRIGGER IF NOT EXISTS plugins_au AFTER UPDATE ON plugins BEGIN
    INSERT INTO plugins_fts(plugins_fts, rowid, name, vendor, category, subcategory, notes)
    VALUES ('delete', old.rowid, old.name, old.vendor, old.category, old.subcategory, old.notes);
    INSERT INTO plugins_fts(rowid, name, vendor, category, subcategory, notes)
    VALUES (new.rowid, new.name, new.vendor, new.category, new.subcategory, new.notes);
END;

-- Tags
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plugin_tags (
    plugin_id TEXT NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (plugin_id, tag_id)
);

-- Collections
CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_smart INTEGER NOT NULL DEFAULT 0,
    smart_filter TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS collection_plugins (
    collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    plugin_id TEXT NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    added_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (collection_id, plugin_id)
);

-- Toggle history (undo journal)
CREATE TABLE IF NOT EXISTS toggle_history (
    id TEXT PRIMARY KEY,
    plugin_id TEXT NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    original_path TEXT NOT NULL,
    target_path TEXT NOT NULL,
    method TEXT NOT NULL,
    performed_at TEXT NOT NULL DEFAULT (datetime('now')),
    undone INTEGER NOT NULL DEFAULT 0
);

-- Scan paths
CREATE TABLE IF NOT EXISTS scan_paths (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    format TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    added_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('disabled_folder', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('toggle_method', 'move');
INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'system');
INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_scan_on_launch', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('ai_provider', 'openai');
INSERT OR IGNORE INTO settings (key, value) VALUES ('ai_model', 'gpt-4o-mini');
INSERT OR IGNORE INTO settings (key, value) VALUES ('ai_api_key', '');
