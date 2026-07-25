//! SCSS font-face template rendering and file generation.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use crate::discovery::scan_input_tree;
use crate::domain::{FontEntry, FontStyle};
use crate::naming::{build_font_entries, infer_font_family_name};

const FONT_WEIGHT_GUIDE: &str = "// Font Weight Guide\n// -----------------\n// 100 - thin\n// 200 - extralight\n// 300 - light\n// 400 - regular / normal\n// 500 - medium\n// 600 - semi-bold\n// 700 - bold\n// 800 - extrabold\n// 900 - black / heavy";

/// Font file formats supported by the generated SCSS `src` list.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ScssFormat {
    /// Web Open Font Format version 2.
    Woff2,
    /// Web Open Font Format version 1.
    Woff,
    /// TrueType font.
    Ttf,
    /// OpenType font.
    Otf,
}

impl ScssFormat {
    /// Returns the extension emitted in a font source URL.
    #[must_use]
    pub const fn extension(self) -> &'static str {
        match self {
            Self::Woff2 => ".woff2",
            Self::Woff => ".woff",
            Self::Ttf => ".ttf",
            Self::Otf => ".otf",
        }
    }

    /// Returns the CSS format name emitted in a font source URL.
    #[must_use]
    pub const fn css_format(self) -> &'static str {
        match self {
            Self::Woff2 => "woff2",
            Self::Woff => "woff",
            Self::Ttf => "truetype",
            Self::Otf => "opentype",
        }
    }
}

/// Returns the TypeScript-compatible label for a generated SCSS include.
#[must_use]
pub fn include_comment(weight: u16, style: FontStyle) -> String {
    if weight == 400 {
        return match style {
            FontStyle::Normal => "Normal".to_owned(),
            FontStyle::Italic => "Italic".to_owned(),
        };
    }

    let label = match weight {
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
    };

    match style {
        FontStyle::Normal => label,
        FontStyle::Italic => format!("{label} Italic"),
    }
}

/// Renders the shared SCSS `fontFace` mixin for the detected output formats.
#[must_use]
pub fn template_font_face_mixin(detected_formats: &[ScssFormat]) -> String {
    let source_lines = detected_formats
        .iter()
        .enumerate()
        .map(|(index, format)| {
            let prefix = if index == 0 { "    src: " } else { "         " };
            let suffix = if index + 1 == detected_formats.len() {
                ';'
            } else {
                ','
            };
            format!(
                "{prefix}url(\"#{{$fileName}}{}\") format(\"{}\"){suffix}",
                format.extension(),
                format.css_format()
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        "{FONT_WEIGHT_GUIDE}\n\n// Font Face Mixin\n@mixin fontFace($fontName, $fileName, $fontWeight, $fontStyle) {{\n  @font-face {{\n    font-family: \"#{{$fontName}}\";\n{source_lines}\n    font-weight: #{{$fontWeight}};\n    font-style: #{{$fontStyle}};\n    font-display: swap;\n  }}\n}}\n"
    )
}

/// Renders a complete per-family SCSS artifact.
#[must_use]
pub fn render_scss(
    family_name: &str,
    entries: &[FontEntry],
    detected_formats: &[ScssFormat],
) -> String {
    let includes = entries
        .iter()
        .map(|entry| {
            format!(
                "// {}\n@include fontFace(\"{family_name}\", \"{}\", {}, \"{}\");",
                include_comment(entry.weight, entry.style),
                entry.normalized_base,
                entry.weight,
                style_name(entry.style),
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        "{}\n\n{includes}\n",
        template_font_face_mixin(detected_formats)
    )
}

/// Generates a `[font-name].scss` file for one direct source family directory.
///
/// Returns the written path, or `None` when no source fonts or converted output
/// fonts are present.
pub fn generate_scss_for_dir(
    font_dir: &Path,
    output_font_dir: &Path,
    dir_name: &str,
) -> io::Result<Option<PathBuf>> {
    let font_files = source_font_files(font_dir)?;
    if font_files.is_empty() {
        return Ok(None);
    }

    let detected_formats = detected_formats(output_font_dir)?;
    if detected_formats.is_empty() {
        return Ok(None);
    }

    let family_name = infer_font_family_name(dir_name);
    let entries = build_font_entries(&font_files);
    let output_path = output_font_dir.join(format!("{dir_name}.scss"));
    fs::create_dir_all(output_font_dir)?;
    fs::write(
        &output_path,
        render_scss(&family_name, &entries, &detected_formats),
    )?;
    Ok(Some(output_path))
}

/// Generates SCSS artifacts for all source family directories selected by input discovery.
pub fn generate_font_face_scss(input_dir: &Path, output_dir: &Path) -> io::Result<Vec<PathBuf>> {
    let scan = scan_input_tree(input_dir)?;
    let mut generated = Vec::new();

    for relative_dir in scan.generation_directories {
        let font_dir = input_dir.join(&relative_dir);
        let output_font_dir = output_dir.join(&relative_dir);
        let dir_name = directory_name(&font_dir);
        if let Some(path) = generate_scss_for_dir(&font_dir, &output_font_dir, &dir_name)? {
            generated.push(path);
        }
    }

    Ok(generated)
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

fn detected_formats(output_font_dir: &Path) -> io::Result<Vec<ScssFormat>> {
    let entries = match fs::read_dir(output_font_dir) {
        Ok(entries) => entries,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(error) => return Err(error),
    };
    let names = entries
        .filter_map(Result::ok)
        .map(|entry| entry.file_name())
        .collect::<Vec<_>>();

    Ok([
        ScssFormat::Woff2,
        ScssFormat::Woff,
        ScssFormat::Ttf,
        ScssFormat::Otf,
    ]
    .into_iter()
    .filter(|format| {
        names.iter().any(|name| {
            Path::new(name)
                .extension()
                .is_some_and(|extension| extension.eq_ignore_ascii_case(&format.extension()[1..]))
        })
    })
    .collect())
}

fn directory_name(path: &Path) -> String {
    path.file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned()
}

const fn style_name(style: FontStyle) -> &'static str {
    match style {
        FontStyle::Normal => "normal",
        FontStyle::Italic => "italic",
    }
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::Path;
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::{
        ScssFormat, generate_font_face_scss, generate_scss_for_dir, include_comment, render_scss,
        template_font_face_mixin,
    };
    use crate::domain::{FontEntry, FontStyle};

    #[test]
    fn template_font_face_mixin_matches_typescript_template() {
        assert_eq!(
            template_font_face_mixin(&[ScssFormat::Woff2, ScssFormat::Woff]),
            "// Font Weight Guide\n// -----------------\n// 100 - thin\n// 200 - extralight\n// 300 - light\n// 400 - regular / normal\n// 500 - medium\n// 600 - semi-bold\n// 700 - bold\n// 800 - extrabold\n// 900 - black / heavy\n\n// Font Face Mixin\n@mixin fontFace($fontName, $fileName, $fontWeight, $fontStyle) {\n  @font-face {\n    font-family: \"#{$fontName}\";\n    src: url(\"#{$fileName}.woff2\") format(\"woff2\"),\n         url(\"#{$fileName}.woff\") format(\"woff\");\n    font-weight: #{$fontWeight};\n    font-style: #{$fontStyle};\n    font-display: swap;\n  }\n}\n"
        );
    }

    #[test]
    fn include_comment_matches_typescript_weight_labels() {
        assert_eq!(include_comment(400, FontStyle::Normal), "Normal");
        assert_eq!(include_comment(400, FontStyle::Italic), "Italic");
        assert_eq!(include_comment(700, FontStyle::Italic), "Bold Italic");
        assert_eq!(include_comment(450, FontStyle::Normal), "450");
    }

    #[test]
    fn render_scss_orders_includes_from_the_supplied_entries() {
        let entries = [
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
        ];

        let rendered = render_scss("DM Sans", &entries, &[ScssFormat::Woff2]);
        assert!(rendered.contains(
            "// Normal\n@include fontFace(\"DM Sans\", \"dm-sans-regular\", 400, \"normal\");"
        ));
        assert!(rendered.contains("// Bold Italic\n@include fontFace(\"DM Sans\", \"dm-sans-bold-italic\", 700, \"italic\");"));
        assert!(rendered.ends_with("\n"));
    }

    #[test]
    fn generate_scss_for_dir_detects_formats_in_typescript_priority_order() {
        let root = temporary_directory();
        let input = root.join("input/dm-sans");
        let output = root.join("output/dm-sans");
        write_file(&input.join("DMSans-Regular.TTF"), b"");
        write_file(&output.join("dm-sans-regular.OTF"), b"");
        write_file(&output.join("dm-sans-regular.woff"), b"");
        write_file(&output.join("dm-sans-regular.woff2"), b"");

        let generated = generate_scss_for_dir(&input, &output, "dm-sans")
            .expect("generate SCSS")
            .expect("SCSS output");
        let scss = fs::read(generated).expect("read SCSS");
        let scss = String::from_utf8(scss).expect("UTF-8 SCSS");

        assert!(scss.contains("format(\"woff2\"),\n         url(\"#{$fileName}.woff\") format(\"woff\"),\n         url(\"#{$fileName}.otf\") format(\"opentype\");"));
        remove_directory(root);
    }

    #[test]
    fn generate_scss_for_dir_skips_missing_source_or_converted_fonts() {
        let root = temporary_directory();
        let input = root.join("input/dm-sans");
        let output = root.join("output/dm-sans");
        fs::create_dir_all(&input).expect("create input");
        assert_eq!(
            generate_scss_for_dir(&input, &output, "dm-sans").expect("skip"),
            None
        );

        write_file(&input.join("DMSans-Regular.ttf"), b"");
        assert_eq!(
            generate_scss_for_dir(&input, &output, "dm-sans").expect("skip"),
            None
        );
        remove_directory(root);
    }

    #[test]
    fn generate_font_face_scss_supports_a_flat_input_layout() {
        let root = temporary_directory();
        let input = root.join("dm-sans");
        let output = root.join("output");
        write_file(&input.join("DMSans-Regular.ttf"), b"");
        write_file(&output.join("dm-sans-regular.woff2"), b"");

        assert_eq!(
            generate_font_face_scss(&input, &output).expect("generate SCSS"),
            vec![output.join("dm-sans.scss")]
        );
        remove_directory(root);
    }

    fn temporary_directory() -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time after epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("nexus-webfont-scss-{unique}"));
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
