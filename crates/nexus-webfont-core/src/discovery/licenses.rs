//! License-file discovery rules.

use std::path::Path;

/// Returns whether a path is a supported license file, excluding `.gitkeep`.
pub fn is_license_file(path: &Path) -> bool {
    let Some(file_name) = path.file_name().and_then(|value| value.to_str()) else {
        return false;
    };
    if file_name == ".gitkeep" {
        return false;
    }

    match path.extension().and_then(|value| value.to_str()) {
        None => true,
        Some(extension) => matches!(
            extension.to_ascii_lowercase().as_str(),
            "txt" | "md" | "pdf"
        ),
    }
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::is_license_file;

    #[test]
    fn is_license_file_accepts_supported_extensions_and_extensionless_files() {
        for file_name in ["LICENSE", "notice.TXT", "readme.md", "terms.PDF"] {
            assert!(is_license_file(Path::new(file_name)), "file: {file_name}");
        }
        assert!(!is_license_file(Path::new(".gitkeep")));
        assert!(!is_license_file(Path::new("font.ttf")));
    }
}
