//! Input-tree scanning for source fonts and license files.

use std::path::{Path, PathBuf};

use walkdir::WalkDir;

use super::is_license_file;

/// A deterministic summary of conversion inputs found below a root directory.
///
/// Font eligibility depends only on the supported source extension. License
/// files are collected independently for copying and never gate conversion.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InputTreeScan {
    /// Font paths relative to the input root.
    pub font_files: Vec<PathBuf>,
    /// License paths relative to the input root.
    pub license_files: Vec<PathBuf>,
    /// Directories requiring SCSS and HTML generation, relative to input root.
    pub generation_directories: Vec<PathBuf>,
}

/// Scans input recursively without following symlinks and returns sorted paths.
pub fn scan_input_tree(input_dir: &Path) -> std::io::Result<InputTreeScan> {
    let mut font_files = Vec::new();
    let mut license_files = Vec::new();
    let mut immediate_directories = Vec::new();
    let mut directories_with_direct_fonts = Vec::new();
    let mut has_direct_root_fonts = false;

    for entry in WalkDir::new(input_dir).follow_links(false).min_depth(1) {
        let entry = entry.map_err(std::io::Error::other)?;
        let relative_path = entry
            .path()
            .strip_prefix(input_dir)
            .expect("walk entry is below input root");
        let depth = relative_path.components().count();

        if entry.file_type().is_dir() {
            if depth == 1 {
                immediate_directories.push(relative_path.to_path_buf());
            }
            continue;
        }
        if !entry.file_type().is_file() {
            continue;
        }

        if is_source_font(relative_path) {
            font_files.push(relative_path.to_path_buf());
            if depth == 1 {
                has_direct_root_fonts = true;
            } else if depth == 2 {
                directories_with_direct_fonts.push(first_component(relative_path));
            }
        }
        if is_license_file(relative_path) {
            license_files.push(relative_path.to_path_buf());
        }
    }

    sort_and_deduplicate(&mut font_files);
    sort_and_deduplicate(&mut license_files);
    sort_and_deduplicate(&mut immediate_directories);
    sort_and_deduplicate(&mut directories_with_direct_fonts);

    let generation_directories = if immediate_directories.is_empty() {
        if has_direct_root_fonts {
            vec![PathBuf::new()]
        } else {
            Vec::new()
        }
    } else {
        immediate_directories
            .into_iter()
            .filter(|directory| {
                directories_with_direct_fonts
                    .binary_search(directory)
                    .is_ok()
            })
            .collect()
    };

    Ok(InputTreeScan {
        font_files,
        license_files,
        generation_directories,
    })
}

/// Returns whether a path has a supported case-insensitive source extension.
fn is_source_font(path: &Path) -> bool {
    matches!(
        path.extension().and_then(|value| value.to_str()),
        Some(extension) if extension.eq_ignore_ascii_case("ttf") || extension.eq_ignore_ascii_case("otf")
    )
}

/// Gets the first component of a relative path.
fn first_component(path: &Path) -> PathBuf {
    path.components()
        .next()
        .map(|component| PathBuf::from(component.as_os_str()))
        .unwrap_or_default()
}

/// Sorts and deduplicates relative paths using their platform representation.
fn sort_and_deduplicate(paths: &mut Vec<PathBuf>) {
    paths.sort();
    paths.dedup();
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::scan_input_tree;

    fn temporary_directory() -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time after epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("nexus-webfont-scan-{unique}"));
        fs::create_dir_all(&path).expect("create temporary directory");
        path
    }

    #[test]
    fn scan_input_tree_discovers_fonts_without_requiring_a_family_license() {
        let root = temporary_directory();
        fs::create_dir_all(root.join("alpha/nested")).expect("create nested directory");
        fs::create_dir_all(root.join("beta")).expect("create beta directory");
        fs::write(root.join("alpha/Font.TTF"), []).expect("write font");
        fs::write(root.join("alpha/nested/Other.otf"), []).expect("write nested font");
        fs::write(root.join("beta/LICENSE"), []).expect("write license");
        fs::write(root.join(".gitkeep"), []).expect("write gitkeep");

        let scan = scan_input_tree(&root).expect("scan input");

        assert_eq!(
            scan.font_files,
            vec![
                std::path::PathBuf::from("alpha/Font.TTF"),
                std::path::PathBuf::from("alpha/nested/Other.otf"),
            ]
        );
        assert_eq!(
            scan.license_files,
            vec![std::path::PathBuf::from("beta/LICENSE")]
        );
        assert_eq!(
            scan.generation_directories,
            vec![std::path::PathBuf::from("alpha")]
        );

        fs::remove_dir_all(root).expect("remove temporary directory");
    }
}
