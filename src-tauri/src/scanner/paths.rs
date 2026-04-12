use crate::db::models::ScanPathConfig;
use crate::utils::platform;

pub fn get_default_scan_paths() -> Vec<ScanPathConfig> {
    let mut paths = Vec::new();

    #[cfg(target_os = "macos")]
    {
        let home = platform::home_dir();

        // VST3
        paths.push(ScanPathConfig {
            path: "/Library/Audio/Plug-Ins/VST3".to_string(),
            format: "VST3".to_string(),
            is_default: true,
        });
        paths.push(ScanPathConfig {
            path: home.join("Library/Audio/Plug-Ins/VST3").to_string_lossy().to_string(),
            format: "VST3".to_string(),
            is_default: true,
        });

        // VST2
        paths.push(ScanPathConfig {
            path: "/Library/Audio/Plug-Ins/VST".to_string(),
            format: "VST2".to_string(),
            is_default: true,
        });
        paths.push(ScanPathConfig {
            path: home.join("Library/Audio/Plug-Ins/VST").to_string_lossy().to_string(),
            format: "VST2".to_string(),
            is_default: true,
        });

        // AU
        paths.push(ScanPathConfig {
            path: "/Library/Audio/Plug-Ins/Components".to_string(),
            format: "AU".to_string(),
            is_default: true,
        });
        paths.push(ScanPathConfig {
            path: home.join("Library/Audio/Plug-Ins/Components").to_string_lossy().to_string(),
            format: "AU".to_string(),
            is_default: true,
        });

        // AAX
        paths.push(ScanPathConfig {
            path: "/Library/Application Support/Avid/Audio/Plug-Ins".to_string(),
            format: "AAX".to_string(),
            is_default: true,
        });

        // CLAP
        paths.push(ScanPathConfig {
            path: "/Library/Audio/Plug-Ins/CLAP".to_string(),
            format: "CLAP".to_string(),
            is_default: true,
        });
        paths.push(ScanPathConfig {
            path: home.join("Library/Audio/Plug-Ins/CLAP").to_string_lossy().to_string(),
            format: "CLAP".to_string(),
            is_default: true,
        });
    }

    #[cfg(target_os = "windows")]
    {
        // VST3
        paths.push(ScanPathConfig {
            path: r"C:\Program Files\Common Files\VST3".to_string(),
            format: "VST3".to_string(),
            is_default: true,
        });

        // VST2
        paths.push(ScanPathConfig {
            path: r"C:\Program Files\VSTPlugins".to_string(),
            format: "VST2".to_string(),
            is_default: true,
        });
        paths.push(ScanPathConfig {
            path: r"C:\Program Files\Steinberg\VSTPlugins".to_string(),
            format: "VST2".to_string(),
            is_default: true,
        });
        paths.push(ScanPathConfig {
            path: r"C:\Program Files\Common Files\VST2".to_string(),
            format: "VST2".to_string(),
            is_default: true,
        });

        // Check registry for custom VST path
        if let Ok(output) = std::process::Command::new("reg")
            .args(["query", r"HKLM\SOFTWARE\VST", "/v", "VSTPluginsPath"])
            .output()
        {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                if let Some(line) = stdout.lines().find(|l| l.contains("VSTPluginsPath")) {
                    if let Some(path) = line.split("REG_SZ").nth(1) {
                        let path = path.trim().to_string();
                        if !path.is_empty() {
                            paths.push(ScanPathConfig {
                                path,
                                format: "VST2".to_string(),
                                is_default: true,
                            });
                        }
                    }
                }
            }
        }

        // AAX
        paths.push(ScanPathConfig {
            path: r"C:\Program Files\Common Files\Avid\Audio\Plug-Ins".to_string(),
            format: "AAX".to_string(),
            is_default: true,
        });

        // CLAP
        paths.push(ScanPathConfig {
            path: r"C:\Program Files\Common Files\CLAP".to_string(),
            format: "CLAP".to_string(),
            is_default: true,
        });
    }

    // Check CLAP_PATH env var on all platforms
    if let Ok(clap_path) = std::env::var("CLAP_PATH") {
        for p in clap_path.split(':') {
            let p = p.trim();
            if !p.is_empty() {
                paths.push(ScanPathConfig {
                    path: p.to_string(),
                    format: "CLAP".to_string(),
                    is_default: true,
                });
            }
        }
    }

    paths
}
