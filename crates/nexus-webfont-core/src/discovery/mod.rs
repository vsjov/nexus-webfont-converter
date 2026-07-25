//! Deterministic input discovery without recursive symlink traversal.

mod font_targets;
mod licenses;
mod scan_input;

pub use font_targets::{FontTarget, build_font_targets};
pub use licenses::is_license_file;
pub use scan_input::{InputTreeScan, scan_input_tree};
