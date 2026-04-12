use std::path::Path;

use crate::utils::errors::AppError;

/// Check if we have write permission to the given path
pub fn check_write_permission(path: &Path) -> Result<bool, AppError> {
    let check_path = if path.is_dir() {
        path.to_path_buf()
    } else {
        path.parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| path.to_path_buf())
    };

    // On Unix, use libc::access which respects the full permission model (uid, gid, ACLs)
    #[cfg(unix)]
    {
        use std::ffi::CString;
        let c_path = CString::new(check_path.to_string_lossy().as_bytes())
            .map_err(|_| AppError::Permission("Invalid path".to_string()))?;
        let result = unsafe { libc::access(c_path.as_ptr(), libc::W_OK) };
        if result != 0 {
            return Err(AppError::Permission(format!(
                "No write permission for {}",
                check_path.display()
            )));
        }
    }

    // On Windows, check read-only attribute
    #[cfg(windows)]
    {
        let metadata = std::fs::metadata(&check_path).map_err(|e| {
            AppError::Permission(format!("Cannot access {}: {}", check_path.display(), e))
        })?;
        if metadata.permissions().readonly() {
            return Err(AppError::Permission(format!(
                "Path is read-only: {}",
                check_path.display()
            )));
        }
    }

    Ok(true)
}

/// Check if a file is currently in use (Windows-specific)
#[cfg(windows)]
pub fn check_file_in_use(path: &Path) -> Result<bool, AppError> {
    use std::fs::OpenOptions;

    match OpenOptions::new().write(true).open(path) {
        Ok(_) => Ok(false),
        Err(e) if e.kind() == std::io::ErrorKind::PermissionDenied => Ok(true),
        Err(e) => Err(AppError::Io(e)),
    }
}

#[cfg(not(windows))]
pub fn check_file_in_use(_path: &Path) -> Result<bool, AppError> {
    Ok(false)
}
