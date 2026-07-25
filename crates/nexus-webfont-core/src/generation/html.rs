//! HTML font-preview rendering, parsing, and file generation.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use crate::discovery::{build_font_targets, is_license_file, scan_input_tree};
use crate::domain::{FontEntry, FontStyle};
use crate::naming::{build_font_entries, infer_font_family_name};

const PREVIEW_TEMPLATE: &str = include_str!("../../templates/preview.html");
const PREVIEW_STYLES: &str = include_str!("../../templates/preview.css");

/// A glyph group that can be rendered in an HTML font preview.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PreviewGlyph {
    /// The standard English pangram.
    Sample,
    /// Arabic numerals.
    Digits,
    /// Common punctuation and symbols.
    Punctuation,
    /// Currency symbols.
    Currency,
    /// Basic Latin letters.
    Latin,
    /// Serbian Cyrillic letters.
    Cyrillic,
    /// ISO-8859-1 extended Latin letters.
    Latin1,
    /// ISO-8859-1 symbols and punctuation.
    Latin1Supplemental,
    /// ISO-8859-2 extended Latin letters.
    Latin2,
    /// Unicode Latin Extended-A letters.
    LatinExtA,
    /// Unicode Latin Extended-B letters.
    LatinExtB,
}

impl PreviewGlyph {
    /// Returns the TypeScript glyph key converted to a CSS class suffix.
    #[must_use]
    pub const fn css_class(self) -> &'static str {
        match self {
            Self::Sample => "sample",
            Self::Digits => "digits",
            Self::Punctuation => "punctuation",
            Self::Currency => "currency",
            Self::Latin => "latin",
            Self::Cyrillic => "cyrillic",
            Self::Latin1 => "latin1",
            Self::Latin1Supplemental => "latin1-supplemental",
            Self::Latin2 => "latin2",
            Self::LatinExtA => "latin-ext-a",
            Self::LatinExtB => "latin-ext-b",
        }
    }

    /// Returns the sample text associated with this glyph group.
    #[must_use]
    pub const fn text(self) -> &'static str {
        match self {
            Self::Sample => "The quick brown fox jumps over the lazy dog",
            Self::Digits => "0 1 2 3 4 5 6 7 8 9",
            Self::Punctuation => "! @ # $ % ^ & * ( ) - _ = + [ ] { } ; : ' \" , . < > / ?",
            Self::Currency => "₠ ₡ ₢ ₣ ₤ ₥ ₦ ₧ ₨ ₩ ₪ ₫ € ₭ ₮ ₯ ₰ ₱ ₲ ₳ ₴ ₵ ₶ ₷ ₸ ₹ ₺ ₻ ₼ ₽ ₾ ₿",
            Self::Latin => {
                "A B C D E F G H I J K L M N O P Q R S T U V W X Y Z a b c d e f g h i j k l m n o p q r s t u v w x y z"
            }
            Self::Cyrillic => {
                "А Б В Г Д Ђ Е Ж З И Ј К Л Љ М Н Њ О П Р С Т Ћ У Ф Х Ц Ч Џ Ш а б в г д ђ е ж з и ј к л љ м н њ о п р с т ћ у ф х ц ч џ ш"
            }
            Self::Latin1 => {
                "À Á Â Ã Ä Å Æ Ç È É Ê Ë Ì Í Î Ï Ð Ñ Ò Ó Ô Õ Ö Ø Ù Ú Û Ü Ý Þ ß à á â ã ä å æ ç è é ê ë ì í î ï ð ñ ò ó ô õ ö ø ù ú û ü ý þ ÿ"
            }
            Self::Latin1Supplemental => {
                "¡ ¢ £ ¤ ¥ ¦ § ¨ © ª « ¬ ® ¯ ° ± ² ³ ´ µ ¶ · ¸ ¹ º » ¼ ½ ¾ ¿"
            }
            Self::Latin2 => {
                "Ą ą Ć ć Č č Ď ď Đ đ Ě ě Ę ę Ĺ ĺ Ľ ľ Ł ł Ń ń Ň ň Ő ő Ř ř Ś ś Š š Ş ş Ť ť Ţ ţ Ű ű Ů ů Ź ź Ž ž Ż ż"
            }
            Self::LatinExtA => {
                "Ā ā Ă ă Ą ą Ć ć Ĉ ĉ Ċ ċ Č č Ď ď Đ đ Ē ē Ĕ ĕ Ė ė Ę ę Ě ě Ĝ ĝ Ğ ğ Ġ ġ Ģ ģ Ĥ ĥ Ħ ħ Ĩ ĩ Ī ī Ĭ ĭ Į į İ ı Ĳ ĳ Ĵ ĵ Ķ ķ ĸ Ĺ ĺ Ļ ļ Ľ ľ Ŀ ŀ Ł ł Ń ń Ņ ņ Ň ň ŉ Ŋ ŋ Ō ō Ŏ ŏ Ő ő Œ œ Ŕ ŕ Ŗ ŗ Ř ř Ś ś Ŝ ŝ Ş ş Š š Ţ ţ Ť ť Ŧ ŧ Ũ ũ Ū ū Ŭ ŭ Ů ů Ű ű Ų ų Ŵ ŵ Ŷ ŷ Ÿ Ź ź Ż ż Ž ž ſ"
            }
            Self::LatinExtB => {
                "ƀ Ɓ Ƃ ƃ Ɔ Ƈ ƈ Ɖ Ɗ Ƌ ƌ Ǝ Ə Ɛ Ƒ ƒ Ɠ Ɣ Ɩ Ɨ Ƙ ƙ Ɯ Ɲ Ɵ Ơ ơ Ƣ ƣ Ƥ ƥ Ʀ Ƨ ƨ Ʃ Ƭ ƭ Ʈ Ư ư Ʊ Ʋ Ƴ ƴ Ƶ ƶ Ʒ Ƹ ƹ Ǎ ǎ Ǐ ǐ Ǒ ǒ Ǔ ǔ Ǵ ǵ Ǹ ǹ Ǻ ǻ Ǽ ǽ Ǿ ǿ Ș ș Ț ț Ȧ ȧ Ȩ ȩ Ȳ ȳ Ⱥ Ȼ ȼ Ƀ Ʉ Ʌ Ɇ ɇ Ɉ ɉ Ɋ ɋ Ɍ ɍ Ɏ ɏ"
            }
        }
    }
}

const DEFAULT_PREVIEW_GLYPHS: &[PreviewGlyph] = &[
    PreviewGlyph::Currency,
    PreviewGlyph::Latin1Supplemental,
    PreviewGlyph::Latin1,
    PreviewGlyph::Latin2,
    PreviewGlyph::Cyrillic,
];

/// Renders a complete HTML preview page matching the Node implementation.
#[must_use]
pub fn render_html_preview(
    family_name: &str,
    dir_name: &str,
    entries: &[FontEntry],
    glyphs: &[PreviewGlyph],
    license_file: Option<&str>,
) -> String {
    let family_name = escape_html(family_name);
    let variant_sections = entries
        .iter()
        .map(|entry| render_variant(&family_name, entry, glyphs))
        .collect::<Vec<_>>()
        .join("\n\n");
    let glyph_styles = glyphs
        .iter()
        .map(|glyph| {
            format!(
                "    .variant__sample--{} {{ font-size: 1rem; color: #999; }}",
                glyph.css_class()
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    let license = license_file.map_or_else(String::new, |license_file| {
        let license_file = escape_html(license_file);
        format!("  <footer>\n    <a href=\"{license_file}\"><b>License:</b> {license_file}</a>\n  </footer>")
    });

    PREVIEW_TEMPLATE
        .replace("{{TITLE}}", &format!("{family_name} - Font Preview"))
        .replace("{{STYLESHEET}}", &format!("{}.css", escape_html(dir_name)))
        .replace(
            "{{STYLES}}",
            &PREVIEW_STYLES.replace("/* GLYPH_STYLES */", &glyph_styles),
        )
        .replace("{{FAMILY_NAME}}", &family_name)
        .replace("{{VARIANTS}}", &variant_sections)
        .replace("{{LICENSE}}", &license)
}

/// Generates a `[font-name].html` preview for one direct source family directory.
///
/// Returns the written path, or `None` if the source directory has no font files.
pub fn generate_html_for_dir(
    font_dir: &Path,
    output_font_dir: &Path,
    dir_name: &str,
) -> io::Result<Option<PathBuf>> {
    let font_files = source_font_files(font_dir)?;
    if font_files.is_empty() {
        return Ok(None);
    }

    let family_name = infer_font_family_name(dir_name);
    let entries = build_font_entries(&font_files);
    let html = render_html_preview(
        &family_name,
        dir_name,
        &entries,
        DEFAULT_PREVIEW_GLYPHS,
        find_license_file(output_font_dir)?.as_deref(),
    );
    let output_path = output_font_dir.join(format!("{dir_name}.html"));
    fs::create_dir_all(output_font_dir)?;
    fs::write(&output_path, html)?;
    Ok(Some(output_path))
}

/// Generates HTML previews for all source family directories selected by input discovery.
pub fn generate_font_preview_html(input_dir: &Path, output_dir: &Path) -> io::Result<Vec<PathBuf>> {
    let scan = scan_input_tree(input_dir)?;
    let mut generated = Vec::new();

    for relative_dir in scan.generation_directories {
        let font_dir = input_dir.join(&relative_dir);
        let output_font_dir = output_dir.join(&relative_dir);
        let dir_name = directory_name(&font_dir);
        if let Some(path) = generate_html_for_dir(&font_dir, &output_font_dir, &dir_name)? {
            generated.push(path);
        }
    }

    Ok(generated)
}

/// Re-generates preview pages using entries parsed from existing SCSS artifacts.
pub fn regenerate_font_preview_html(output_dir: &Path) -> io::Result<Vec<PathBuf>> {
    let mut generated = Vec::new();
    for target in build_font_targets(output_dir)? {
        let scss_path = target
            .output_font_dir
            .join(format!("{}.scss", target.dir_name));
        let scss = match fs::read_to_string(&scss_path) {
            Ok(scss) => scss,
            Err(error) if error.kind() == io::ErrorKind::NotFound => continue,
            Err(error) => return Err(error),
        };
        let entries = parse_scss_entries(&scss);
        if entries.is_empty() {
            continue;
        }

        let family_name = infer_font_family_name(&target.dir_name);
        let html = render_html_preview(
            &family_name,
            &target.dir_name,
            &entries,
            DEFAULT_PREVIEW_GLYPHS,
            find_license_file(&target.output_font_dir)?.as_deref(),
        );
        let output_path = target
            .output_font_dir
            .join(format!("{}.html", target.dir_name));
        fs::write(&output_path, html)?;
        generated.push(output_path);
    }
    Ok(generated)
}

/// Parses valid `@include fontFace(...)` calls from generated or hand-edited SCSS.
#[must_use]
pub fn parse_scss_entries(scss: &str) -> Vec<FontEntry> {
    let mut entries = Vec::new();
    let mut offset = 0;

    while let Some(found) = scss[offset..].find("@include") {
        let start = offset + found;
        let Some((entry, end)) = parse_include(&scss[start..]) else {
            offset = start + "@include".len();
            continue;
        };
        entries.push(entry);
        offset = start + end;
    }

    entries
}

fn render_variant(family_name: &str, entry: &FontEntry, glyphs: &[PreviewGlyph]) -> String {
    let style = style_name(entry.style);
    let font_style = format!(
        "font-family: '{family_name}'; font-weight: {}; font-style: {style};",
        entry.weight
    );
    let extra_lines = glyphs
        .iter()
        .map(|glyph| {
            format!(
                "    <p class=\"variant__sample variant__sample--{}\" style=\"{font_style}\">{}</p>",
                glyph.css_class(),
                glyph.text()
            )
        })
        .collect::<Vec<_>>();
    let mut lines = vec![
        "  <section class=\"variant\">".to_owned(),
        format!(
            "    <h2 class=\"variant__label\">{} <span class=\"variant__meta\">{} / {style}</span></h2>",
            variant_label(entry.weight, entry.style),
            entry.weight
        ),
        format!(
            "    <p class=\"variant__sample variant__sample--large\" style=\"{font_style}\">{}</p>",
            PreviewGlyph::Sample.text()
        ),
        format!(
            "    <p class=\"variant__sample variant__sample--small\" style=\"{font_style}\">{}</p>",
            PreviewGlyph::Sample.text()
        ),
        format!(
            "    <p class=\"variant__sample variant__sample--latin\" style=\"{font_style}\">{}</p>",
            PreviewGlyph::Latin.text()
        ),
        format!(
            "    <p class=\"variant__sample variant__sample--digits\" style=\"{font_style}\">{}</p>",
            PreviewGlyph::Digits.text()
        ),
        format!(
            "    <p class=\"variant__sample variant__sample--punctuation\" style=\"{font_style}\">{}</p>",
            PreviewGlyph::Punctuation.text()
        ),
    ];
    lines.extend(extra_lines);
    lines.push("  </section>".to_owned());
    lines.join("\n")
}

fn parse_include(input: &str) -> Option<(FontEntry, usize)> {
    let mut position = "@include".len();
    consume_whitespace(input, &mut position)?;
    consume_literal(input, &mut position, "fontFace")?;
    consume_whitespace_optional(input, &mut position);
    consume_literal(input, &mut position, "(")?;
    consume_whitespace_optional(input, &mut position);
    parse_quoted(input, &mut position)?;
    consume_whitespace_optional(input, &mut position);
    consume_literal(input, &mut position, ",")?;
    consume_whitespace_optional(input, &mut position);
    let normalized_base = parse_quoted(input, &mut position)?.to_owned();
    consume_whitespace_optional(input, &mut position);
    consume_literal(input, &mut position, ",")?;
    consume_whitespace_optional(input, &mut position);
    let weight_start = position;
    while input
        .as_bytes()
        .get(position)
        .is_some_and(u8::is_ascii_digit)
    {
        position += 1;
    }
    let weight = input[weight_start..position].parse().ok()?;
    consume_whitespace_optional(input, &mut position);
    consume_literal(input, &mut position, ",")?;
    consume_whitespace_optional(input, &mut position);
    let style = match parse_quoted(input, &mut position)? {
        "normal" => FontStyle::Normal,
        "italic" => FontStyle::Italic,
        _ => return None,
    };
    consume_whitespace_optional(input, &mut position);
    consume_literal(input, &mut position, ")")?;
    consume_whitespace_optional(input, &mut position);
    if input.as_bytes().get(position) == Some(&b';') {
        position += 1;
    }

    Some((
        FontEntry {
            normalized_base,
            weight,
            style,
        },
        position,
    ))
}

fn parse_quoted<'a>(input: &'a str, position: &mut usize) -> Option<&'a str> {
    let quote = *input.as_bytes().get(*position)?;
    if quote != b'\'' && quote != b'\"' {
        return None;
    }
    *position += 1;
    let start = *position;
    while let Some(byte) = input.as_bytes().get(*position) {
        if *byte == quote {
            let value = &input[start..*position];
            *position += 1;
            return (!value.is_empty()).then_some(value);
        }
        *position += 1;
    }
    None
}

fn consume_literal(input: &str, position: &mut usize, literal: &str) -> Option<()> {
    input[*position..].starts_with(literal).then(|| {
        *position += literal.len();
    })
}

fn consume_whitespace(input: &str, position: &mut usize) -> Option<()> {
    let initial = *position;
    consume_whitespace_optional(input, position);
    (*position > initial).then_some(())
}

fn consume_whitespace_optional(input: &str, position: &mut usize) {
    while input
        .as_bytes()
        .get(*position)
        .is_some_and(u8::is_ascii_whitespace)
    {
        *position += 1;
    }
}

fn source_font_files(font_dir: &Path) -> io::Result<Vec<PathBuf>> {
    Ok(fs::read_dir(font_dir)?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| {
            path.extension().is_some_and(|extension| {
                extension.eq_ignore_ascii_case("ttf") || extension.eq_ignore_ascii_case("otf")
            })
        })
        .collect())
}

fn find_license_file(output_font_dir: &Path) -> io::Result<Option<String>> {
    let entries = match fs::read_dir(output_font_dir) {
        Ok(entries) => entries,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error),
    };

    for entry in entries {
        let entry = entry?;
        // Node's path.extname treats a dotfile such as `.gitkeep` as extensionless.
        let is_node_license_file =
            is_license_file(&entry.path()) || entry.file_name() == ".gitkeep";
        if entry.file_type()?.is_file() && is_node_license_file {
            return Ok(Some(entry.file_name().to_string_lossy().into_owned()));
        }
    }
    Ok(None)
}

fn directory_name(path: &Path) -> String {
    path.file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned()
}

fn variant_label(weight: u16, style: FontStyle) -> String {
    if weight == 400 {
        return match style {
            FontStyle::Normal => "Regular".to_owned(),
            FontStyle::Italic => "Italic".to_owned(),
        };
    }
    let label = weight_label(weight);
    match style {
        FontStyle::Normal => label,
        FontStyle::Italic => format!("{label} Italic"),
    }
}

fn weight_label(weight: u16) -> String {
    match weight {
        100 => "Thin".to_owned(),
        200 => "Extra Light".to_owned(),
        300 => "Light".to_owned(),
        400 => "Regular".to_owned(),
        500 => "Medium".to_owned(),
        600 => "Semi Bold".to_owned(),
        700 => "Bold".to_owned(),
        800 => "Extra Bold".to_owned(),
        900 => "Black".to_owned(),
        _ => weight.to_string(),
    }
}

const fn style_name(style: FontStyle) -> &'static str {
    match style {
        FontStyle::Normal => "normal",
        FontStyle::Italic => "italic",
    }
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::Path;
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::{
        PreviewGlyph, generate_font_preview_html, generate_html_for_dir, parse_scss_entries,
        regenerate_font_preview_html, render_html_preview,
    };
    use crate::domain::{FontEntry, FontStyle};

    #[test]
    fn render_html_preview_matches_typescript_sections_and_escaping() {
        let html = render_html_preview(
            "DM <Sans>",
            "dm-sans",
            &[FontEntry {
                normalized_base: "dm-sans-bold-italic".into(),
                weight: 700,
                style: FontStyle::Italic,
            }],
            &[PreviewGlyph::Currency, PreviewGlyph::LatinExtA],
            Some("LICENSE & TERMS.txt"),
        );

        assert!(html.starts_with("<!DOCTYPE html>\n<html lang=\"en\">"));
        assert!(html.contains("<title>DM &lt;Sans&gt; - Font Preview</title>"));
        assert!(html.contains("Bold Italic <span class=\"variant__meta\">700 / italic</span>"));
        assert!(html.contains("variant__sample--latin-ext-a"));
        assert!(
            html.contains("font-family: 'DM &lt;Sans&gt;'; font-weight: 700; font-style: italic;")
        );
        assert!(html.contains(
            "<a href=\"LICENSE &amp; TERMS.txt\"><b>License:</b> LICENSE &amp; TERMS.txt</a>"
        ));
    }

    #[test]
    fn parse_scss_entries_supports_quotes_whitespace_and_multiple_entries() {
        let scss = "@include fontFace(\"DM Sans\", \"dm-sans-regular\", 400, \"normal\");\n@include   fontFace ( 'DM Sans' , 'dm-sans-bold-italic' , 700 , 'italic' ) ;";

        assert_eq!(
            parse_scss_entries(scss),
            vec![
                FontEntry {
                    normalized_base: "dm-sans-regular".into(),
                    weight: 400,
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

    #[test]
    fn parse_scss_entries_ignores_invalid_mixin_signatures() {
        assert!(
            parse_scss_entries("@include otherMixin(\"DM Sans\", \"regular\", 400, \"normal\");")
                .is_empty()
        );
        assert!(
            parse_scss_entries("@include fontFace(\"DM Sans\", \"regular\", 400, \"bold\");")
                .is_empty()
        );
    }

    #[test]
    fn generate_html_for_dir_writes_default_glyphs_and_license_link() {
        let root = temporary_directory();
        let input = root.join("input/dm-sans");
        let output = root.join("output/dm-sans");
        write_file(&input.join("DMSans-Regular.ttf"), b"");
        write_file(&output.join("LICENSE.txt"), b"");

        let generated = generate_html_for_dir(&input, &output, "dm-sans")
            .expect("generate HTML")
            .expect("HTML output");
        let html = fs::read_to_string(generated).expect("read HTML");

        assert!(html.contains("<title>DM Sans - Font Preview</title>"));
        assert!(html.contains("variant__sample--currency"));
        assert!(html.contains("variant__sample--latin1-supplemental"));
        assert!(html.contains("<footer>"));
        remove_directory(root);
    }

    #[test]
    fn generate_html_for_dir_matches_node_dotfile_license_detection() {
        let root = temporary_directory();
        let input = root.join("input/dm-sans");
        let output = root.join("output/dm-sans");
        write_file(&input.join("DMSans-Regular.ttf"), b"");
        write_file(&output.join(".gitkeep"), b"");

        let generated = generate_html_for_dir(&input, &output, "dm-sans")
            .expect("generate HTML")
            .expect("HTML output");
        let html = fs::read_to_string(generated).expect("read HTML");

        assert!(html.contains("<a href=\".gitkeep\"><b>License:</b> .gitkeep</a>"));
        remove_directory(root);
    }

    #[test]
    fn generate_font_preview_html_supports_a_flat_input_layout() {
        let root = temporary_directory();
        let input = root.join("dm-sans");
        let output = root.join("output");
        write_file(&input.join("DMSans-Regular.ttf"), b"");

        assert_eq!(
            generate_font_preview_html(&input, &output).expect("generate HTML"),
            vec![output.join("dm-sans.html")]
        );
        remove_directory(root);
    }

    #[test]
    fn regenerate_font_preview_html_uses_scss_entries_for_flat_output() {
        let root = temporary_directory();
        let output = root.join("output");
        write_file(
            &output.join("dm-sans.scss"),
            b"@include fontFace(\"DM Sans\", \"dm-sans-regular\", 400, \"normal\");",
        );

        assert_eq!(
            regenerate_font_preview_html(&output).expect("regenerate HTML"),
            vec![output.join("dm-sans.html")]
        );
        assert!(output.join("dm-sans.html").exists());
        remove_directory(root);
    }

    #[test]
    fn regenerate_font_preview_html_skips_missing_scss_and_empty_includes() {
        let root = temporary_directory();
        let output = root.join("output");
        fs::create_dir_all(output.join("missing")).expect("create missing target");
        write_file(&output.join("empty/empty.scss"), b"// no entries");

        assert!(
            regenerate_font_preview_html(&output)
                .expect("skip targets")
                .is_empty()
        );
        remove_directory(root);
    }

    fn temporary_directory() -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time after epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("nexus-webfont-html-{unique}"));
        fs::create_dir_all(&path).expect("create temporary directory");
        path
    }

    fn write_file(path: &Path, contents: &[u8]) {
        fs::create_dir_all(path.parent().expect("file parent")).expect("create file parent");
        fs::write(path, contents).expect("write fixture");
    }

    fn remove_directory(path: std::path::PathBuf) {
        fs::remove_dir_all(path).expect("remove temporary directory");
    }
}
