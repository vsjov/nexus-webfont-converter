//! Filesystem safety checks used before any output mutation.

mod safe_output;

pub use safe_output::{OutputPathError, validate_output_path, validate_output_root};
