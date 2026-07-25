//! Safe input/output relationship validation.

use std::io;
use std::path::{Path, PathBuf};

use thiserror::Error;

/// A reason an output directory cannot be used with an input directory.
#[derive(Debug, Error)]
pub enum OutputPathError {
    /// The input directory could not be canonicalized.
    #[error("failed to resolve input directory {path}: {source}")]
    InputResolution {
        /// Path provided by the caller.
        path: PathBuf,
        /// Underlying filesystem error.
        #[source]
        source: io::Error,
    },
    /// No existing ancestor was found while resolving a future output path.
    #[error("failed to resolve output directory {path}: no existing ancestor")]
    OutputResolution {
        /// Path provided by the caller.
        path: PathBuf,
    },
    /// Output is a filesystem root and is never a cleanup target.
    #[error("output directory cannot be a filesystem root")]
    OutputIsFilesystemRoot,
    /// Input and output resolve to the same directory.
    #[error("output directory cannot be the same as the input directory")]
    SameDirectory,
    /// Output resolves inside the input directory.
    #[error("output directory cannot be a subfolder of the input directory")]
    OutputInsideInput,
    /// Input resolves inside the output directory.
    #[error("input directory cannot be a subfolder of the output directory")]
    InputInsideOutput,
}

/// Validates that output is neither equal to nor nested with input.
///
/// Existing input segments are canonicalized before comparison. A missing output
/// path is normalized from its nearest existing parent, which prevents a later
/// directory creation from bypassing the containment guard.
pub fn validate_output_path(input: &Path, output: &Path) -> Result<(), OutputPathError> {
    let resolved_input =
        input
            .canonicalize()
            .map_err(|source| OutputPathError::InputResolution {
                path: input.to_path_buf(),
                source,
            })?;
    let resolved_output = normalize_output_path(output)?;

    if is_filesystem_root(&resolved_output) {
        return Err(OutputPathError::OutputIsFilesystemRoot);
    }
    if resolved_input == resolved_output {
        return Err(OutputPathError::SameDirectory);
    }
    if resolved_output.starts_with(&resolved_input) {
        return Err(OutputPathError::OutputInsideInput);
    }
    if resolved_input.starts_with(&resolved_output) {
        return Err(OutputPathError::InputInsideOutput);
    }

    Ok(())
}

/// Resolves existing output segments while retaining a missing suffix.
fn normalize_output_path(output: &Path) -> Result<PathBuf, OutputPathError> {
    let absolute_output = if output.is_absolute() {
        output.to_path_buf()
    } else {
        std::env::current_dir()
            .map_err(|_| OutputPathError::OutputResolution {
                path: output.to_path_buf(),
            })?
            .join(output)
    };
    let mut existing_ancestor = absolute_output.as_path();
    let mut missing_segments = Vec::new();

    while !existing_ancestor.exists() {
        let file_name =
            existing_ancestor
                .file_name()
                .ok_or_else(|| OutputPathError::OutputResolution {
                    path: output.to_path_buf(),
                })?;
        missing_segments.push(file_name.to_owned());
        existing_ancestor =
            existing_ancestor
                .parent()
                .ok_or_else(|| OutputPathError::OutputResolution {
                    path: output.to_path_buf(),
                })?;
    }

    let mut normalized =
        existing_ancestor
            .canonicalize()
            .map_err(|_| OutputPathError::OutputResolution {
                path: output.to_path_buf(),
            })?;
    for segment in missing_segments.iter().rev() {
        normalized.push(segment);
    }
    Ok(normalized)
}

/// Returns whether a path is the root of its filesystem.
fn is_filesystem_root(path: &Path) -> bool {
    path.parent().is_none()
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::{OutputPathError, validate_output_path};

    fn temporary_directory(name: &str) -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time after epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("nexus-webfont-core-{name}-{unique}"));
        fs::create_dir_all(&path).expect("create temporary directory");
        path
    }

    #[test]
    fn validate_output_path_rejects_equal_and_nested_paths() {
        let root = temporary_directory("safe-output");
        let input = root.join("input");
        let output = root.join("output");
        fs::create_dir_all(&input).expect("create input");
        fs::create_dir_all(input.join("nested")).expect("create nested input");
        fs::create_dir_all(&output).expect("create output");

        assert!(matches!(
            validate_output_path(&input, &input),
            Err(OutputPathError::SameDirectory)
        ));
        assert!(matches!(
            validate_output_path(&input, &input.join("nested")),
            Err(OutputPathError::OutputInsideInput)
        ));
        assert!(matches!(
            validate_output_path(&input, &input.join("missing/output")),
            Err(OutputPathError::OutputInsideInput)
        ));
        assert!(matches!(
            validate_output_path(&input.join("nested"), &input),
            Err(OutputPathError::InputInsideOutput)
        ));
        assert!(validate_output_path(&input, &output).is_ok());
        assert!(validate_output_path(&input, &output.join("missing/child")).is_ok());

        fs::remove_dir_all(root).expect("remove temporary directory");
    }

    #[cfg(unix)]
    #[test]
    fn validate_output_path_resolves_a_symlinked_output_ancestor() {
        use std::os::unix::fs::symlink;

        let root = temporary_directory("symlink-output");
        let input = root.join("input");
        let output_link = root.join("output-link");
        fs::create_dir_all(&input).expect("create input");
        symlink(&input, &output_link).expect("create output symlink");

        assert!(matches!(
            validate_output_path(&input, &output_link.join("child")),
            Err(OutputPathError::OutputInsideInput)
        ));

        fs::remove_dir_all(root).expect("remove temporary directory");
    }
}
