# Changelog

All notable changes to PluginVault will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-12

Initial release.

### Features
- **Scan** VST3, VST2, AU, AAX, CLAP plugins across standard OS directories
- **Search & filter** your library with SQLite FTS5 full-text search
- **Enable/disable** plugins by safely moving them (never deleting)
- **Collections** for virtual grouping (Mixing, Mastering, etc.)
- **Bulk operations** — enable, disable, move many plugins at once
- **Physical organization** — move to custom location, auto-organize by vendor
- **Reveal in Finder/Explorer** — jump to any plugin's file location
- **Delete** plugins (from DB only, or permanently from disk)
- **Recent Activity** — full toggle history with one-click undo
- **Export** plugin list to CSV (RFC 4180) or Markdown
- **Group by vendor** — collapsible vendor tree view
- **Notes** — annotate any plugin

### Privacy & Security
- 100% local — no telemetry, no cloud sync, no account required
- All data stored in local SQLite database
- Path canonicalization prevents symlink attacks
- `libc::access(W_OK)` permission checks respect full ACL model
- Parameterized SQL queries throughout
- Scoped Tauri filesystem permissions (no unrestricted frontend access)
- Stream-hashed file scanning (no memory OOM on multi-GB libraries)

### Performance
- Hash caching by `(path, size)` — re-scans are near-instant
- Batched transactional DB upserts (50 plugins per batch)
- Scanner releases DB mutex between batches — UI stays responsive
- Max scan depth 15 catches deeply-nested vendor folders

### Integration Tests
7 passing tests covering:
- Full scan → toggle → undo flow
- Move to custom location
- Auto-organize by vendor
- Permanent delete (with and without file removal)
- Empty DB stats
- Search with no results
