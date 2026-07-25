//! Filename normalization compatible with the TypeScript implementation.

/// Converts a font filename stem to lowercase, hyphenated form.
///
/// ASCII camel-case boundaries, spaces, underscores, and repeated hyphens match
/// the established Node.js behavior. Other Unicode characters are preserved.
pub fn to_hyphenated(name: &str) -> String {
    let chars: Vec<char> = name.chars().collect();
    let mut normalized = String::with_capacity(name.len());

    for (index, character) in chars.iter().copied().enumerate() {
        let previous = index.checked_sub(1).and_then(|value| chars.get(value));
        let next = chars.get(index + 1);
        let inserts_boundary = character.is_ascii_uppercase()
            && previous.is_some_and(|value| {
                value.is_ascii_lowercase()
                    || value.is_ascii_digit()
                    || (value.is_ascii_uppercase()
                        && next.is_some_and(|next_value| next_value.is_ascii_lowercase()))
            });

        if inserts_boundary && !normalized.ends_with('-') {
            normalized.push('-');
        }

        if character.is_whitespace() || character == '_' || character == '-' {
            if !normalized.ends_with('-') {
                normalized.push('-');
            }
        } else {
            normalized.extend(character.to_lowercase());
        }
    }

    normalized
}

#[cfg(test)]
mod tests {
    use super::to_hyphenated;

    #[test]
    fn to_hyphenated_matches_typescript_vectors() {
        let cases = [
            ("DMSans", "dm-sans"),
            ("DMSansBold", "dm-sans-bold"),
            ("DMSans-BoldItalic", "dm-sans-bold-italic"),
            ("DM_Sans Bold-Italic", "dm-sans-bold-italic"),
            ("Font--Name", "font-name"),
            ("ROBOTO", "roboto"),
            ("Noto Sans CJK", "noto-sans-cjk"),
        ];

        for (input, expected) in cases {
            assert_eq!(to_hyphenated(input), expected, "input: {input}");
        }
    }
}
