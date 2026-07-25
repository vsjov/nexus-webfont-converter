//! Output target discovery for maintenance operations.

use std::fs;
use std::path::{Path, PathBuf};

/// A family directory targeted by a maintenance operation.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FontTarget {
    /// Directory containing the family artifacts.
    pub output_font_dir: PathBuf,
    /// Name used to derive family artifacts.
    pub dir_name: String,
}

/// Finds nested family directories, or SCSS-based targets for a flat layout.
pub fn build_font_targets(output_dir: &Path) -> std::io::Result<Vec<FontTarget>> {
    let mut entries: Vec<_> = fs::read_dir(output_dir)?.collect::<Result<_, _>>()?;
    entries.sort_by_key(|entry| entry.file_name());
    let directories: Vec<_> = entries
        .iter()
        .filter_map(|entry| {
            entry
                .file_type()
                .ok()
                .filter(|file_type| file_type.is_dir())
                .map(|_| entry)
        })
        .map(|entry| FontTarget {
            output_font_dir: entry.path(),
            dir_name: entry.file_name().to_string_lossy().into_owned(),
        })
        .collect();

    if !directories.is_empty() {
        return Ok(directories);
    }

    Ok(entries
        .into_iter()
        .filter_map(|entry| {
            let name = entry.file_name();
            let name = name.to_str()?;
            let path = entry.path();
            let dir_name = Path::new(name)
                .file_stem()
                .and_then(|value| value.to_str())?
                .to_owned();
            (path
                .extension()
                .is_some_and(|extension| extension.eq_ignore_ascii_case("scss"))
                && !name.starts_with('_'))
            .then(|| FontTarget {
                output_font_dir: output_dir.to_path_buf(),
                dir_name,
            })
        })
        .collect())
}
