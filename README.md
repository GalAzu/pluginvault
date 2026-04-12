# PluginVault

**A tiny, fast audio plugin manager for Mac and Windows.**

Scan your system, catalog every VST3, VST2, AU, AAX, and CLAP plugin, and organize them without touching your DAW. Free and open source.

![PluginVault Dashboard](docs/screenshots/dashboard.png)

---

## Why

Audio producers end up with hundreds of plugins scattered across a dozen directories. DAWs get slow, plugin menus become unusable, and cleaning up feels risky. PluginVault gives you a single view of everything you own and lets you safely disable what you don't use — without deleting anything.

## Features

- **Scans every major format** — VST3, VST2, AU (Mac), AAX, CLAP
- **Cross-platform** — native desktop app for macOS and Windows
- **Search, filter, sort** — find anything in your library instantly (full-text search powered by SQLite FTS5)
- **Group by vendor** — collapse 400 plugins into a clean vendor tree
- **Safe enable/disable** — moves plugins to a disabled folder, never deletes. Full undo history.
- **Collections** — organize plugins into your own groups (Mixing, Mastering, Sound Design...)
- **Notes** — annotate any plugin with personal notes
- **Export to CSV/Markdown** — share your plugin library or back it up
- **Fast rescans** — cached hashes mean re-scans take seconds, not minutes
- **100% local** — no telemetry, no cloud sync, no account needed. All data stays in a local SQLite file.
- **Tiny** — ~8MB download (Tauri + Rust, not Electron)

## Install

### macOS
1. Download the latest `.dmg` from [Releases](https://github.com/autonomous/pluginvault/releases)
2. Open the DMG and drag PluginVault to Applications
3. First launch may require right-click → Open (Gatekeeper)

### Windows
1. Download the latest `.msi` installer from [Releases](https://github.com/autonomous/pluginvault/releases)
2. Run the installer

## How It Works

On first launch, PluginVault detects your standard plugin directories:

**macOS**
- `/Library/Audio/Plug-Ins/VST3` + `~/Library/Audio/Plug-Ins/VST3`
- `/Library/Audio/Plug-Ins/VST` + `~/Library/Audio/Plug-Ins/VST`
- `/Library/Audio/Plug-Ins/Components` (AU)
- `/Library/Application Support/Avid/Audio/Plug-Ins` (AAX)
- `/Library/Audio/Plug-Ins/CLAP` + `~/Library/Audio/Plug-Ins/CLAP`

**Windows**
- `C:\Program Files\Common Files\VST3`
- `C:\Program Files\VSTPlugins`
- `C:\Program Files\Common Files\Avid\Audio\Plug-Ins`
- `C:\Program Files\Common Files\CLAP`
- Plus any paths in the Windows Registry `HKLM\SOFTWARE\VST`

You can add custom directories via Scanner → Add Path.

### Disable ≠ Delete

PluginVault never deletes plugin files. When you disable a plugin, it's moved to a `PluginVault Disabled` folder next to the original location. To re-enable, click the toggle again — the file is moved back. Every toggle is logged in **Recent Activity** with one-click undo.

### Privacy

PluginVault runs entirely on your device. Plugin metadata is stored in a local SQLite database at:
- macOS: `~/Library/Application Support/com.pluginvault.app/pluginvault.db`
- Windows: `%APPDATA%\com.pluginvault.app\pluginvault.db`

**Zero telemetry. Zero tracking. No cloud sync. No account required.**

## Build From Source

### Prerequisites
- [Rust](https://rustup.rs/) (1.75+)
- [Node.js](https://nodejs.org/) (18+)
- Platform-specific:
  - **macOS:** Xcode Command Line Tools
  - **Windows:** Visual Studio Build Tools 2022 with C++ workload

### Build
```bash
git clone https://github.com/autonomous/pluginvault.git
cd pluginvault
npm install
npm run tauri build
```

Output:
- macOS: `src-tauri/target/release/bundle/dmg/PluginVault_1.0.0_aarch64.dmg`
- Windows: `src-tauri/target/release/bundle/msi/PluginVault_1.0.0_x64_en-US.msi`

### Develop
```bash
npm run tauri dev
```

## Architecture

- **Backend:** Rust + Tauri v2 + SQLite (via `rusqlite`, bundled)
- **Frontend:** React 19 + TypeScript + Vite
- **Database:** SQLite with FTS5 full-text search
- **Plugin scanning:** `walkdir` + format-specific metadata parsers (moduleinfo.json for VST3, Info.plist for AU on macOS, PE version info for Windows)
- **File operations:** Canonicalized paths, symlink-safe, transactional DB upserts in batches of 50

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT License — see [LICENSE](LICENSE).

---

Built by [Autonomous](https://autobiz.digital). Part of the [Plugin Academy](https://autobiz.digital) ecosystem.
