use std::path::PathBuf;

pub fn is_windows() -> bool {
    cfg!(target_os = "windows")
}

pub fn is_macos() -> bool {
    cfg!(target_os = "macos")
}

pub fn home_dir() -> PathBuf {
    dirs_next().unwrap_or_else(|| PathBuf::from("."))
}

fn dirs_next() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("USERPROFILE").ok().map(PathBuf::from)
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("HOME").ok().map(PathBuf::from)
    }
}

/// Expand ~ and environment variables in a path string
pub fn expand_path(path: &str) -> PathBuf {
    if path.starts_with('~') {
        let home = home_dir();
        home.join(path.strip_prefix("~/").unwrap_or(&path[1..]))
    } else {
        PathBuf::from(path)
    }
}
