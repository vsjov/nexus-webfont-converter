//! License copying and output-only maintenance operations.

use std::collections::BTreeSet;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use thiserror::Error;

use crate::discovery::{build_font_targets, scan_input_tree};
use crate::filesystem::{OutputPathError, validate_output_path, validate_output_root};
use crate::generation::{
    CssCompilationError, compile_css_files, parse_scss_entries, regenerate_font_preview_html,
};

/// Files written or removed by a complete maintenance synchronization.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct SyncReport {
    /// CSS artifacts compiled from SCSS files.
    pub css_files: Vec<PathBuf>,
    /// HTML previews regenerated from SCSS includes.
    pub html_files: Vec<PathBuf>,
    /// Unreferenced WOFF and WOFF2 files removed from family directories.
    pub removed_font_files: Vec<PathBuf>,
}

/// Errors from maintenance operations.
#[derive(Debug, Error)]
pub enum MaintenanceError {
    /// The output is unsafe for a mutation operation.
    #[error("invalid output directory: {source}")]
    InvalidOutput {
        /// Output validation failure.
        #[source]
        source: OutputPathError,
    },
    /// SCSS compilation failed during synchronization.
    #[error(transparent)]
    Css(#[from] CssCompilationError),
    /// A filesystem operation failed.
    #[error("filesystem operation failed: {source}")]
    Filesystem {
        /// Underlying filesystem error.
        #[source]
        source: io::Error,
    },
}

/// Copies supported license files from input to their matching output paths.
///
/// Source-relative paths are preserved, and `.gitkeep` files are excluded by
/// input discovery. The input/output containment check runs before any copy.
pub fn copy_license_files(
    input_dir: &Path,
    output_dir: &Path,
) -> Result<Vec<PathBuf>, MaintenanceError> {
    validate_output_path(input_dir, output_dir)
        .map_err(|source| MaintenanceError::InvalidOutput { source })?;
    let scan = scan_input_tree(input_dir).map_err(filesystem_error)?;
    let mut copied = Vec::with_capacity(scan.license_files.len());

    for relative_path in scan.license_files {
        let destination = output_dir.join(&relative_path);
        let parent = destination.parent().unwrap_or(output_dir);
        fs::create_dir_all(parent).map_err(filesystem_error)?;
        fs::copy(input_dir.join(relative_path), &destination).map_err(filesystem_error)?;
        copied.push(destination);
    }

    Ok(copied)
}

/// Removes unreferenced WOFF and WOFF2 files below a validated output root.
///
/// Family directories without a matching SCSS file, or without parseable
/// `fontFace` includes, are skipped to avoid destructive cleanup from an
/// incomplete artifact set.
pub fn remove_unused_fonts(output_dir: &Path) -> Result<Vec<PathBuf>, MaintenanceError> {
    let output_dir = validated_output_dir(output_dir)?;
    let mut removed = Vec::new();

    for target in build_font_targets(&output_dir).map_err(filesystem_error)? {
        let scss_path = target
            .output_font_dir
            .join(format!("{}.scss", target.dir_name));
        let scss = match fs::read_to_string(&scss_path) {
            Ok(scss) => scss,
            Err(error) if error.kind() == io::ErrorKind::NotFound => continue,
            Err(error) => return Err(filesystem_error(error)),
        };
        let referenced_bases: BTreeSet<_> = parse_scss_entries(&scss)
            .into_iter()
            .map(|entry| entry.normalized_base)
            .collect();
        if referenced_bases.is_empty() {
            continue;
        }

        let mut font_files = fs::read_dir(&target.output_font_dir)
            .map_err(filesystem_error)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(filesystem_error)?;
        font_files.sort_by_key(|entry| entry.file_name());
        for entry in font_files {
            if !entry.file_type().map_err(filesystem_error)?.is_file() {
                continue;
            }
            let path = entry.path();
            if !is_web_font(&path) {
                continue;
            }
            let base = path.file_stem().and_then(|value| value.to_str());
            if base.is_some_and(|base| referenced_bases.contains(base)) {
                continue;
            }
            fs::remove_file(&path).map_err(filesystem_error)?;
            removed.push(path);
        }
    }

    Ok(removed)
}

/// Compiles CSS, regenerates previews, then removes unreferenced web fonts.
///
/// The output root is resolved and validated once before the first mutation.
pub fn sync_output(output_dir: &Path) -> Result<SyncReport, MaintenanceError> {
    let output_dir = validated_output_dir(output_dir)?;
    let css_files = compile_css_files(&output_dir)?;
    let html_files = regenerate_font_preview_html(&output_dir).map_err(filesystem_error)?;
    let removed_font_files = remove_unused_fonts(&output_dir)?;

    Ok(SyncReport {
        css_files,
        html_files,
        removed_font_files,
    })
}

fn validated_output_dir(output_dir: &Path) -> Result<PathBuf, MaintenanceError> {
    validate_output_root(output_dir).map_err(|source| MaintenanceError::InvalidOutput { source })
}

fn filesystem_error(source: io::Error) -> MaintenanceError {
    MaintenanceError::Filesystem { source }
}

fn is_web_font(path: &Path) -> bool {
    path.extension().is_some_and(|extension| {
        extension.eq_ignore_ascii_case("woff") || extension.eq_ignore_ascii_case("woff2")
    })
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::Path;
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::{MaintenanceError, copy_license_files, remove_unused_fonts, sync_output};

    #[test]
    fn copy_license_files_preserves_relative_paths_and_skips_non_licenses() {
        let root = temporary_directory();
        let input = root.join("input");
        let output = root.join("output");
        write_file(&input.join("family/LICENSE"), b"license");
        write_file(&input.join("family/nested/NOTICE.PDF"), b"pdf");
        write_file(&input.join("family/.gitkeep"), b"");
        write_file(&input.join("family/Font.ttf"), b"font");

        assert_eq!(
            copy_license_files(&input, &output).expect("copy licenses"),
            vec![
                output.join("family/LICENSE"),
                output.join("family/nested/NOTICE.PDF"),
            ]
        );
        assert_eq!(
            fs::read(output.join("family/LICENSE")).expect("read license"),
            b"license"
        );
        assert_eq!(
            fs::read(output.join("family/nested/NOTICE.PDF")).expect("read PDF"),
            b"pdf"
        );
        assert!(!output.join("family/.gitkeep").exists());
        assert!(!output.join("family/Font.ttf").exists());
        remove_directory(root);
    }

    #[test]
    fn remove_unused_fonts_keeps_referenced_files_and_removes_both_web_formats() {
        let root = temporary_directory();
        let output = root.join("output");
        let family = output.join("dm-sans");
        write_file(
            &family.join("dm-sans.scss"),
            b"@include fontFace(\"DM Sans\", \"dm-sans-regular\", 400, \"normal\");",
        );
        write_file(&family.join("dm-sans-regular.woff"), b"");
        write_file(&family.join("dm-sans-regular.woff2"), b"");
        write_file(&family.join("dm-sans-old.WOFF"), b"");
        write_file(&family.join("dm-sans-old.WOFF2"), b"");
        write_file(&family.join("dm-sans.css"), b"");

        assert_eq!(
            remove_unused_fonts(&output).expect("remove unused fonts"),
            vec![
                family.join("dm-sans-old.WOFF"),
                family.join("dm-sans-old.WOFF2"),
            ]
        );
        assert!(family.join("dm-sans-regular.woff").exists());
        assert!(family.join("dm-sans-regular.woff2").exists());
        assert!(family.join("dm-sans.css").exists());
        remove_directory(root);
    }

    #[test]
    fn remove_unused_fonts_skips_missing_or_unparseable_scss() {
        let root = temporary_directory();
        let output = root.join("output");
        let no_scss = output.join("no-scss");
        let empty = output.join("empty");
        write_file(&no_scss.join("old.woff2"), b"");
        write_file(&empty.join("empty.scss"), b"// no includes");
        write_file(&empty.join("old.woff"), b"");

        assert!(
            remove_unused_fonts(&output)
                .expect("skip unsafe cleanup")
                .is_empty()
        );
        assert!(no_scss.join("old.woff2").exists());
        assert!(empty.join("old.woff").exists());
        remove_directory(root);
    }

    #[test]
    fn sync_output_compiles_css_regenerates_html_and_removes_unused_fonts() {
        let root = temporary_directory();
        let output = root.join("output");
        let family = output.join("dm-sans");
        write_file(
            &family.join("dm-sans.scss"),
            br##"@mixin fontFace($fontName, $fileName, $fontWeight, $fontStyle) {
  @font-face { font-family: "#{$fontName}"; src: url("#{$fileName}.woff2") format("woff2"); font-weight: #{$fontWeight}; font-style: #{$fontStyle}; }
}
@include fontFace("DM Sans", "dm-sans-regular", 400, "normal");
"##,
        );
        write_file(&family.join("dm-sans-regular.woff2"), b"");
        write_file(&family.join("dm-sans-old.woff2"), b"");

        let report = sync_output(&output).expect("sync output");

        assert_eq!(report.css_files, vec![family.join("dm-sans.css")]);
        assert_eq!(report.html_files, vec![family.join("dm-sans.html")]);
        assert_eq!(
            report.removed_font_files,
            vec![family.join("dm-sans-old.woff2")]
        );
        assert!(family.join("dm-sans.html").exists());
        assert!(!family.join("dm-sans-old.woff2").exists());
        remove_directory(root);
    }

    #[test]
    fn sync_output_rejects_a_filesystem_root_before_mutating() {
        assert!(matches!(
            sync_output(Path::new("/")),
            Err(MaintenanceError::InvalidOutput { .. })
        ));
    }

    fn temporary_directory() -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time after epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("nexus-webfont-maintenance-{unique}"));
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
