//! Deterministic source-name normalization and metadata inference.

mod entries;
mod family_name;
mod hyphenate;
mod style;
mod weight;

pub use entries::build_font_entries;
pub use family_name::infer_font_family_name;
pub use hyphenate::to_hyphenated;
pub use style::infer_font_style;
pub use weight::infer_font_weight;
