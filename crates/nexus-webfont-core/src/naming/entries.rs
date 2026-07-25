//! Construction, deduplication, and sorting of font entries.

use std::collections::BTreeMap;
use std::path::Path;

use crate::domain::{FontEntry, FontStyle};

use super::{infer_font_style, infer_font_weight, to_hyphenated};

/// Builds deduplicated font entries sorted by weight, style, and normalized name.
pub fn build_font_entries(font_files: &[impl AsRef<Path>]) -> Vec<FontEntry> {
    let mut entries = BTreeMap::new();

    for file in font_files {
        let path = file.as_ref();
        let raw_name = path
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or_default();
        let entry = FontEntry {
            normalized_base: to_hyphenated(raw_name),
            weight: infer_font_weight(raw_name),
            style: infer_font_style(raw_name),
        };
        entries
            .entry((entry.normalized_base.clone(), entry.weight, entry.style))
            .or_insert(entry);
    }

    let mut values: Vec<_> = entries.into_values().collect();
    values.sort_by(|left, right| {
        left.weight
            .cmp(&right.weight)
            .then_with(|| style_rank(left.style).cmp(&style_rank(right.style)))
            .then_with(|| left.normalized_base.cmp(&right.normalized_base))
    });
    values
}

/// Returns the TypeScript-compatible ordering rank for a font style.
fn style_rank(style: FontStyle) -> u8 {
    match style {
        FontStyle::Normal => 0,
        FontStyle::Italic => 1,
    }
}

#[cfg(test)]
mod tests {
    use super::build_font_entries;
    use crate::domain::{FontEntry, FontStyle};

    #[test]
    fn build_font_entries_matches_typescript_vectors() {
        assert_eq!(
            build_font_entries(&[
                "DMSans-BoldItalic.ttf",
                "DMSans-Bold.ttf",
                "DM Sans Bold.ttf",
                "dm-sans-bold.ttf",
            ]),
            vec![
                FontEntry {
                    normalized_base: "dm-sans-bold".into(),
                    weight: 700,
                    style: FontStyle::Normal,
                },
                FontEntry {
                    normalized_base: "dm-sans-bold-italic".into(),
                    weight: 700,
                    style: FontStyle::Italic,
                },
            ]
        );
    }
}
