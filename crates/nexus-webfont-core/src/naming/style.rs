//! Font style inference.

use crate::domain::FontStyle;

/// Infers italic style from a filename, treating oblique as italic.
pub fn infer_font_style(file_name: &str) -> FontStyle {
    let lowercase_name = file_name.to_ascii_lowercase();

    if lowercase_name.contains("italic") || lowercase_name.contains("oblique") {
        FontStyle::Italic
    } else {
        FontStyle::Normal
    }
}

#[cfg(test)]
mod tests {
    use super::infer_font_style;
    use crate::domain::FontStyle;

    #[test]
    fn infer_font_style_matches_typescript_vectors() {
        assert_eq!(infer_font_style("DMSans-BoldItalic"), FontStyle::Italic);
        assert_eq!(infer_font_style("DMSans-BoldOblique"), FontStyle::Italic);
        assert_eq!(infer_font_style("DMSans-Regular"), FontStyle::Normal);
    }
}
