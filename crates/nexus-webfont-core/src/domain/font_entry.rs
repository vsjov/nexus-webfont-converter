//! Font metadata inferred from file names.

/// CSS font style inferred from a source file name.
#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub enum FontStyle {
    /// A normal, upright font face.
    Normal,
    /// An italic or oblique font face.
    Italic,
}

/// Metadata needed to generate a font-face include.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FontEntry {
    /// Lowercase, hyphenated source basename.
    pub normalized_base: String,
    /// CSS numeric font weight.
    pub weight: u16,
    /// CSS font style.
    pub style: FontStyle,
}
