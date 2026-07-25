//! Font weight inference.

/// Infers the CSS numeric font weight using TypeScript-compatible precedence.
pub fn infer_font_weight(file_name: &str) -> u16 {
    const WEIGHT_PATTERNS: [(&str, u16); 12] = [
        ("extra light", 200),
        ("ultra light", 200),
        ("extra bold", 800),
        ("ultra bold", 800),
        ("semi bold", 600),
        ("demi bold", 600),
        ("thin", 100),
        ("light", 300),
        ("medium", 500),
        ("bold", 700),
        ("black", 900),
        ("heavy", 900),
    ];
    let normalized_name = file_name.to_ascii_lowercase();

    for (pattern, weight) in WEIGHT_PATTERNS {
        let mut words = pattern.split(' ');
        let first_word = words.next().expect("weight pattern has a first word");
        let second_word = words.next();

        let matches_pattern = match second_word {
            Some(second_word) => {
                contains_compound_weight(&normalized_name, first_word, second_word)
            }
            None => normalized_name.contains(first_word),
        };

        if matches_pattern {
            return weight;
        }
    }

    400
}

/// Matches two weight words separated by nothing, one hyphen, or one whitespace character.
fn contains_compound_weight(file_name: &str, first_word: &str, second_word: &str) -> bool {
    file_name.match_indices(first_word).any(|(index, _)| {
        let suffix = &file_name[index + first_word.len()..];
        suffix.starts_with(second_word)
            || suffix
                .strip_prefix('-')
                .is_some_and(|suffix| suffix.starts_with(second_word))
            || suffix
                .chars()
                .next()
                .filter(|character| character.is_whitespace())
                .is_some_and(|character| suffix[character.len_utf8()..].starts_with(second_word))
    })
}

#[cfg(test)]
mod tests {
    use super::infer_font_weight;

    #[test]
    fn infer_font_weight_matches_typescript_vectors() {
        let cases = [
            ("Roboto-Thin", 100),
            ("Roboto-ExtraLight", 200),
            ("DMSans-LightItalic", 300),
            ("DMSans-Regular", 400),
            ("DMSans-MediumItalic", 500),
            ("DMSans-Demi Bold", 600),
            ("DMSans-BoldItalic", 700),
            ("DMSans-UltraBold", 800),
            ("DMSans-Heavy", 900),
            ("Font-ExtraBold", 800),
            ("Font-Extra  Bold", 700),
            ("Font-Extra\tBold", 800),
        ];

        for (input, expected) in cases {
            assert_eq!(infer_font_weight(input), expected, "input: {input}");
        }
    }
}
