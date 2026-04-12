# Contributing to PluginVault

Thanks for your interest in making PluginVault better! This document explains how to contribute code, report bugs, and propose features.

## Quick Start

```bash
git clone https://github.com/autonomous/pluginvault.git
cd pluginvault
npm install
npm run tauri dev
```

## Reporting Bugs

Open an [issue](https://github.com/autonomous/pluginvault/issues) with:
- Your OS (macOS version or Windows version)
- PluginVault version (Settings → About)
- Steps to reproduce
- What you expected vs. what happened
- Logs (if the app crashed) from:
  - macOS: `~/Library/Logs/com.pluginvault.app/`
  - Windows: `%LOCALAPPDATA%\com.pluginvault.app\logs\`

**Critical:** if a bug affected your plugin files (e.g., plugin went missing), include the SQLite database file — it contains the full toggle history and may help us recover the file's location.

## Proposing Features

Open an issue tagged `enhancement`. Before writing code, please discuss the design — we want to keep PluginVault small and focused. Some things we intentionally won't add:

- DAW integration (scope creep)
- Plugin preset management (different product)
- Cloud sync (privacy is a feature)
- Telemetry

## Development

### Stack
- **Rust** for the backend (Tauri v2, rusqlite, walkdir)
- **React 19 + TypeScript** for the frontend
- **SQLite** for local storage (FTS5 for search)

### Project layout
```
src/                      # React frontend
  pages/                  # Top-level pages
  components/             # Shared components
  lib/                    # Tauri invoke wrappers, types, utils
  stores/                 # Zustand state
  styles/tokens.ts        # Design tokens — use these, never hardcode
src-tauri/
  src/
    commands/             # Tauri command handlers (#[tauri::command])
    scanner/              # Plugin discovery + metadata extraction
    db/                   # SQLite connection, queries, migrations
    filemanager/          # Enable/disable file operations
    ai/                   # Local heuristics + OpenAI categorization
    utils/
```

### Code style

**Rust**
- All queries must be parameterized (`params![]`) — never `format!()` user input
- Hold `Mutex<Connection>` guards for as short a time as possible — NEVER across `.await`
- File operations MUST canonicalize paths before move/copy
- Return `Result<T, String>` from all `#[tauri::command]` functions

**TypeScript**
- Inline styles only — no Tailwind classes (we compile with Tailwind for the theme tokens)
- Import colors from `src/styles/tokens.ts`, never hardcode hex values
- All Tauri calls go through `src/lib/tauri.ts` wrappers, not raw `invoke()`

### Testing

```bash
# Type check
cd /path/to/pluginvault && npx tsc --noEmit

# Rust check
cd src-tauri && cargo check

# Full build
npm run tauri build
```

Currently there are no unit tests — contributions welcome. Priority areas:
1. Scanner metadata extraction (mock file system)
2. FTS search edge cases
3. Toggle enable/disable with symlinks

## Pull Requests

1. Fork the repo
2. Create a branch: `git checkout -b fix/something` or `feature/something`
3. Make your changes
4. Run `cargo check` and `npx tsc --noEmit` to verify compilation
5. Test manually — scan → browse → toggle → undo
6. Commit with a clear message
7. Open a PR against `main`

## Adding Support For A New Plugin Format

If you want to add support for a new plugin format:
1. Add the extension to `src-tauri/src/scanner/discovery.rs` in `detect_bundle_format` / `detect_file_format`
2. Create `src-tauri/src/scanner/{format}.rs` with a `parse_metadata` function
3. Wire it in `src-tauri/src/scanner/metadata.rs`
4. Add the OS-specific default paths to `src-tauri/src/scanner/paths.rs`
5. Add the format to the frontend `formatColors` in `src/styles/tokens.ts`
6. Add it to `ALL_FORMATS` in `src/pages/PluginList.tsx`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
