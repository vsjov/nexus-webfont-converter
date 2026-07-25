//! Full conversion pipeline orchestration.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use thiserror::Error;

use crate::conversion::{
    ConversionReport, ConvertDirectoryError, ConvertDirectoryOptions, convert_fonts_in_dir,
};
use crate::domain::OutputFormat;
use crate::filesystem::{OutputPathError, validate_output_path};
use crate::generation::{
    CssCompilationError, compile_css_files, generate_font_face_scss, generate_font_preview_html,
};
use crate::maintenance::{MaintenanceError, copy_license_files};

/// Options controlling a complete conversion pipeline run.
#[derive(Clone, Debug)]
pub struct PipelineOptions {
    /// Destination root for generated webfont artifacts.
    pub output_dir: PathBuf,
    /// Requested output containers. Defaults to WOFF and WOFF2.
    pub formats: Vec<OutputFormat>,
    /// Maximum concurrent font conversions. Defaults to available CPU parallelism.
    pub worker_count: usize,
}

impl PipelineOptions {
    /// Creates options with the standard WOFF and WOFF2 formats.
    #[must_use]
    pub fn new(output_dir: impl Into<PathBuf>) -> Self {
        let conversion = ConvertDirectoryOptions::new(output_dir);
        Self {
            output_dir: conversion.output_dir,
            formats: conversion.formats,
            worker_count: conversion.worker_count,
        }
    }
}

/// Artifacts produced by a successful full conversion pipeline run.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PipelineReport {
    /// Outcomes for every requested source-font conversion.
    pub conversion: ConversionReport,
    /// License files copied from input to output.
    pub license_files: Vec<PathBuf>,
    /// Generated per-family SCSS files.
    pub scss_files: Vec<PathBuf>,
    /// CSS files compiled from generated SCSS.
    pub css_files: Vec<PathBuf>,
    /// Generated HTML preview files.
    pub html_files: Vec<PathBuf>,
}

/// Errors from a complete conversion pipeline run.
#[derive(Debug, Error)]
pub enum PipelineError {
    /// The output fails the pre-mutation containment guard.
    #[error("invalid output directory: {source}")]
    InvalidOutput {
        /// Output safety validation error.
        #[source]
        source: OutputPathError,
    },
    /// Preparing or cleaning the output directory failed.
    #[error("failed to clean output directory {path}: {source}")]
    Clean {
        /// Output directory being prepared.
        path: PathBuf,
        /// Underlying filesystem error.
        #[source]
        source: io::Error,
    },
    /// Font conversion failed before artifact generation could begin.
    #[error(transparent)]
    Conversion(#[from] ConvertDirectoryError),
    /// License copying failed before artifact generation could begin.
    #[error("failed to copy license files: {source}")]
    LicenseCopy {
        /// Underlying license-copying error.
        #[source]
        source: MaintenanceError,
    },
    /// A worker executing a concurrent pipeline stage panicked.
    #[error("a concurrent pipeline stage panicked")]
    ConcurrentStagePanicked,
    /// SCSS generation failed.
    #[error("failed to generate SCSS artifacts: {source}")]
    Scss {
        /// Underlying filesystem error.
        #[source]
        source: io::Error,
    },
    /// CSS compilation failed.
    #[error(transparent)]
    Css(#[from] CssCompilationError),
    /// HTML preview generation failed.
    #[error("failed to generate HTML previews: {source}")]
    Html {
        /// Underlying filesystem error.
        #[source]
        source: io::Error,
    },
}

/// Runs the complete webfont conversion pipeline.
///
/// The output directory is cleaned first while preserving a root `.gitkeep`.
/// Font conversion and license copying then run concurrently, followed by SCSS,
/// CSS, and HTML generation in dependency order.
///
/// # Errors
///
/// Returns an error if path validation, cleanup, conversion, copying, or
/// artifact generation fails. Later stages do not run after a failed stage.
pub fn run_pipeline(
    input_dir: &Path,
    options: &PipelineOptions,
) -> Result<PipelineReport, PipelineError> {
    clean_output_directory(input_dir, &options.output_dir)?;

    let conversion_options = ConvertDirectoryOptions {
        output_dir: options.output_dir.clone(),
        formats: options.formats.clone(),
        worker_count: options.worker_count,
    };
    let (conversion, license_files) = std::thread::scope(|scope| {
        let conversion = scope.spawn(|| convert_fonts_in_dir(input_dir, &conversion_options));
        let licenses = scope.spawn(|| copy_license_files(input_dir, &options.output_dir));
        (conversion.join(), licenses.join())
    });
    let conversion = conversion.map_err(|_| PipelineError::ConcurrentStagePanicked)??;
    let license_files = license_files
        .map_err(|_| PipelineError::ConcurrentStagePanicked)?
        .map_err(|source| PipelineError::LicenseCopy { source })?;
    let scss_files = generate_font_face_scss(input_dir, &options.output_dir)
        .map_err(|source| PipelineError::Scss { source })?;
    let css_files = compile_css_files(&options.output_dir)?;
    let html_files = generate_font_preview_html(input_dir, &options.output_dir)
        .map_err(|source| PipelineError::Html { source })?;

    Ok(PipelineReport {
        conversion,
        license_files,
        scss_files,
        css_files,
        html_files,
    })
}

/// Clears an output directory after validating it against the input tree.
fn clean_output_directory(input_dir: &Path, output_dir: &Path) -> Result<(), PipelineError> {
    validate_output_path(input_dir, output_dir)
        .map_err(|source| PipelineError::InvalidOutput { source })?;
    fs::create_dir_all(output_dir).map_err(|source| PipelineError::Clean {
        path: output_dir.to_path_buf(),
        source,
    })?;

    for entry in fs::read_dir(output_dir).map_err(|source| PipelineError::Clean {
        path: output_dir.to_path_buf(),
        source,
    })? {
        let entry = entry.map_err(|source| PipelineError::Clean {
            path: output_dir.to_path_buf(),
            source,
        })?;
        if entry.file_name() == ".gitkeep" {
            continue;
        }
        let path = entry.path();
        let result = if entry
            .file_type()
            .map_err(|source| PipelineError::Clean {
                path: path.clone(),
                source,
            })?
            .is_dir()
        {
            fs::remove_dir_all(&path)
        } else {
            fs::remove_file(&path)
        };
        result.map_err(|source| PipelineError::Clean { path, source })?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::Path;
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::{PipelineOptions, run_pipeline};
    use crate::domain::OutputFormat;

    const TTF: &[u8] = include_bytes!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../fonts-sample/input/ubuntu-mono/UbuntuMonoNerdFont-Regular.ttf"
    ));

    #[test]
    fn run_pipeline_cleans_output_and_generates_all_artifacts() {
        let root = temporary_directory();
        let input = root.join("input");
        let output = root.join("output");
        write_file(&input.join("ubuntu-mono/UbuntuMono-Regular.ttf"), TTF);
        write_file(&input.join("ubuntu-mono/LICENSE.txt"), b"license");
        write_file(&output.join(".gitkeep"), b"");
        write_file(&output.join("stale/file.txt"), b"stale");
        let mut options = PipelineOptions::new(&output);
        options.formats = vec![OutputFormat::Woff];
        options.worker_count = 1;

        let report = run_pipeline(&input, &options).expect("run pipeline");

        assert_eq!(report.conversion.results.len(), 1);
        assert_eq!(
            report.license_files,
            vec![output.join("ubuntu-mono/LICENSE.txt")]
        );
        assert_eq!(
            report.scss_files,
            vec![output.join("ubuntu-mono/ubuntu-mono.scss")]
        );
        assert_eq!(
            report.css_files,
            vec![output.join("ubuntu-mono/ubuntu-mono.css")]
        );
        assert_eq!(
            report.html_files,
            vec![output.join("ubuntu-mono/ubuntu-mono.html")]
        );
        assert!(output.join(".gitkeep").exists());
        assert!(!output.join("stale").exists());
        assert!(output.join("ubuntu-mono/ubuntu-mono-regular.woff").exists());
        remove_directory(root);
    }

    fn temporary_directory() -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time after epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("nexus-webfont-pipeline-{unique}"));
        fs::create_dir_all(&path).expect("create temporary directory");
        path
    }

    fn write_file(path: &Path, contents: &[u8]) {
        fs::create_dir_all(path.parent().expect("file parent")).expect("create file parent");
        fs::write(path, contents).expect("write file");
    }

    fn remove_directory(path: std::path::PathBuf) {
        fs::remove_dir_all(path).expect("remove temporary directory");
    }
}
