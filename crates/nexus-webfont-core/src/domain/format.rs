//! Supported output webfont containers.

/// A browser-consumable webfont output format.
#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub enum OutputFormat {
    /// Web Open Font Format version 1.
    Woff,
    /// Web Open Font Format version 2.
    Woff2,
}
