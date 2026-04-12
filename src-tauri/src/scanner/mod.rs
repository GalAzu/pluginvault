pub mod paths;
pub mod discovery;
pub mod metadata;
pub mod vst3;
pub mod vst2;
pub mod clap;
pub mod aax;

#[cfg(target_os = "macos")]
pub mod au;
