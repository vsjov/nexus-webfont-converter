//! Human-readable family names inferred from output directory names.

/// Converts a hyphenated directory name to a human-readable font family name.
pub fn infer_font_family_name(dir_name: &str) -> String {
    dir_name
        .split('-')
        .map(|word| {
            if word.chars().count() <= 2 {
                word.to_uppercase()
            } else {
                let mut characters = word.chars();
                let first = characters.next().unwrap_or_default();
                format!(
                    "{}{}",
                    first.to_uppercase(),
                    characters.as_str().to_lowercase()
                )
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::infer_font_family_name;

    #[test]
    fn infer_font_family_name_matches_typescript_vectors() {
        let cases = [
            ("roboto", "Roboto"),
            ("roboto-condensed", "Roboto Condensed"),
            ("dm-sans", "DM Sans"),
            ("a-font", "A Font"),
            ("dm-sans-serif", "DM Sans Serif"),
        ];

        for (input, expected) in cases {
            assert_eq!(infer_font_family_name(input), expected, "input: {input}");
        }
    }
}
