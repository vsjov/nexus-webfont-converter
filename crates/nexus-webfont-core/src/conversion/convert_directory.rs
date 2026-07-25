//! Deterministic concurrent directory conversion.

use std::collections::{BTreeMap, BTreeSet};
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{LazyLock, Mutex};

use rayon::ThreadPoolBuilder;
use rayon::prelude::*;
use thiserror::Error;

use crate::discovery::scan_input_tree;
use crate::domain::OutputFormat;
use crate::filesystem::{OutputPathError, validate_output_path};

use super::encode_font;

static TEMPORARY_FILE_COUNTER: AtomicU64 = AtomicU64::new(0);
static ACTIVE_DESTINATIONS: LazyLock<Mutex<BTreeSet<PathBuf>>> =
    LazyLock::new(|| Mutex::new(BTreeSet::new()));

/// Options controlling a directory conversion operation.
#[derive(Clone, Debug)]
pub struct ConvertDirectoryOptions {
    /// Destination root. Source relative paths are preserved below this path.
    pub output_dir: PathBuf,
    /// Requested output containers. Defaults to WOFF and WOFF2.
    pub formats: Vec<OutputFormat>,
    /// Maximum concurrent font tasks. Defaults to available CPU parallelism.
    pub worker_count: usize,
}

impl ConvertDirectoryOptions {
    /// Creates options with the standard WOFF and WOFF2 formats.
    #[must_use]
    pub fn new(output_dir: impl Into<PathBuf>) -> Self {
        Self {
            output_dir: output_dir.into(),
            formats: vec![OutputFormat::Woff, OutputFormat::Woff2],
            worker_count: std::thread::available_parallelism()
                .map_or(1, std::num::NonZeroUsize::get),
        }
    }
}

/// The final state of one source-format conversion attempt.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ConversionStatus {
    /// The encoded font was atomically written to its final destination.
    Succeeded,
    /// Reading, encoding, or writing failed for this source-format pair.
    Failed,
}

/// A completed source-format conversion attempt.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConversionResult {
    /// Source path relative to the conversion input root.
    pub source_path: PathBuf,
    /// Output format attempted.
    pub format: OutputFormat,
    /// Final output destination.
    pub output_path: PathBuf,
    /// Final conversion status.
    pub status: ConversionStatus,
}

/// Detail for one source-format conversion failure.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConversionFailure {
    /// Source path relative to the conversion input root.
    pub source_path: PathBuf,
    /// Output format that failed.
    pub format: OutputFormat,
    /// Final output destination that was not created.
    pub output_path: PathBuf,
    /// Context-rich failure text.
    pub message: String,
}

/// Complete deterministic outcome of a directory conversion attempt.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct ConversionReport {
    /// Per-format results sorted by source path and output format.
    pub results: Vec<ConversionResult>,
    /// Collision warnings sorted by destination path.
    pub warnings: Vec<String>,
    /// Per-format failures sorted by source path and output format.
    pub failures: Vec<ConversionFailure>,
}

/// Errors returned before conversion starts or after a partial conversion failure.
#[derive(Debug, Error)]
pub enum ConvertDirectoryError {
    /// Input discovery failed.
    #[error("failed to scan input directory {input_dir}: {source}")]
    Scan {
        /// Input directory passed by the caller.
        input_dir: PathBuf,
        /// Underlying discovery error.
        #[source]
        source: std::io::Error,
    },
    /// Output fails the pre-mutation containment guard.
    #[error("invalid output directory: {source}")]
    InvalidOutput {
        /// Output safety validation error.
        #[source]
        source: OutputPathError,
    },
    /// At least one task failed after all scheduled tasks completed.
    #[error("{count} font conversion(s) failed")]
    PartialFailure {
        /// Complete report, including successful results and warnings.
        report: ConversionReport,
        /// Number of source-format failures.
        count: usize,
    },
    /// Worker count must be nonzero.
    #[error("worker count must be greater than zero")]
    InvalidWorkerCount,
    /// The bounded Rayon pool could not be initialized.
    #[error("failed to initialize conversion worker pool: {message}")]
    WorkerPool {
        /// Rayon setup error text.
        message: String,
    },
    /// Another conversion operation in this process owns the same destination.
    #[error("output path is already being converted: {output_path}")]
    OverlappingDestination {
        /// Destination reserved by an active conversion operation.
        output_path: PathBuf,
    },
    /// A destination could not be normalized for overlap protection.
    #[error("failed to resolve conversion destination {output_path}: {source}")]
    DestinationResolution {
        /// Destination that could not be normalized.
        output_path: PathBuf,
        /// Underlying filesystem error.
        #[source]
        source: std::io::Error,
    },
}

/// Converts all source fonts below an input directory using bounded native threads.
///
/// Fonts are selected by extension alone. Licenses discovered alongside fonts are
/// intentionally ignored here and are copied by a later pipeline phase.
///
/// # Errors
///
/// Returns [`ConvertDirectoryError::Scan`] before work starts, or
/// [`ConvertDirectoryError::PartialFailure`] after every scheduled task has
/// reported its success or failure.
pub fn convert_fonts_in_dir(
    input_dir: &Path,
    options: &ConvertDirectoryOptions,
) -> Result<ConversionReport, ConvertDirectoryError> {
    if options.worker_count == 0 {
        return Err(ConvertDirectoryError::InvalidWorkerCount);
    }
    validate_output_path(input_dir, &options.output_dir)
        .map_err(|source| ConvertDirectoryError::InvalidOutput { source })?;

    let scan = scan_input_tree(input_dir).map_err(|source| ConvertDirectoryError::Scan {
        input_dir: input_dir.to_path_buf(),
        source,
    })?;
    let (tasks, warnings) = build_tasks(&scan.font_files, &options.output_dir, &options.formats);
    let _destination_reservation = reserve_destinations(&tasks)?;
    let pool = ThreadPoolBuilder::new()
        .num_threads(options.worker_count)
        .build()
        .map_err(|error| ConvertDirectoryError::WorkerPool {
            message: error.to_string(),
        })?;
    let task_reports = pool.install(|| {
        tasks
            .par_iter()
            .map(|task| convert_task(input_dir, task))
            .collect::<Vec<_>>()
    });
    let mut report = ConversionReport {
        warnings,
        ..ConversionReport::default()
    };

    for task_report in task_reports {
        report.results.extend(task_report.results);
        report.failures.extend(task_report.failures);
    }
    report.results.sort_by(compare_result);
    report.failures.sort_by(compare_failure);

    if report.failures.is_empty() {
        Ok(report)
    } else {
        Err(ConvertDirectoryError::PartialFailure {
            count: report.failures.len(),
            report,
        })
    }
}

#[derive(Clone, Debug)]
struct ConversionTask {
    source_path: PathBuf,
    outputs: Vec<ConversionOutput>,
}

#[derive(Clone, Debug)]
struct ConversionOutput {
    format: OutputFormat,
    output_path: PathBuf,
}

#[derive(Default)]
struct TaskReport {
    results: Vec<ConversionResult>,
    failures: Vec<ConversionFailure>,
}

/// Builds collision-free tasks and deterministic warnings from discovered fonts.
fn build_tasks(
    source_paths: &[PathBuf],
    output_dir: &Path,
    formats: &[OutputFormat],
) -> (Vec<ConversionTask>, Vec<String>) {
    let formats = unique_formats(formats);
    let mut candidates_by_output = BTreeMap::<PathBuf, Vec<ConversionCandidate>>::new();

    for source_path in source_paths {
        let normalized_base = normalize_source_basename(source_path);
        let source_directory = source_path.parent().unwrap_or_else(|| Path::new(""));

        for format in &formats {
            let output_path = output_dir
                .join(source_directory)
                .join(format!("{normalized_base}.{}", format.extension()));
            candidates_by_output
                .entry(output_path.clone())
                .or_default()
                .push(ConversionCandidate {
                    source_path: source_path.clone(),
                    format: *format,
                    output_path,
                });
        }
    }

    let mut tasks_by_source = BTreeMap::<PathBuf, ConversionTask>::new();
    let mut warnings = Vec::new();

    for candidates in candidates_by_output.into_values() {
        let preferred = select_preferred_candidate(&candidates);
        for candidate in candidates
            .iter()
            .filter(|candidate| *candidate != preferred)
        {
            warnings.push(format!(
                "Skipping {} because it would overwrite {} generated from {}",
                display_source_name(&candidate.source_path),
                display_source_name(&candidate.output_path),
                display_source_name(&preferred.source_path),
            ));
        }
        let task = tasks_by_source
            .entry(preferred.source_path.clone())
            .or_insert_with(|| ConversionTask {
                source_path: preferred.source_path.clone(),
                outputs: Vec::new(),
            });
        task.outputs.push(ConversionOutput {
            format: preferred.format,
            output_path: preferred.output_path.clone(),
        });
    }

    let mut tasks: Vec<_> = tasks_by_source.into_values().collect();
    for task in &mut tasks {
        task.outputs.sort_by_key(|output| output.format);
    }
    warnings.sort();
    (tasks, warnings)
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct ConversionCandidate {
    source_path: PathBuf,
    format: OutputFormat,
    output_path: PathBuf,
}

/// Selects TTF before OTF, then Node-compatible ASCII source-name order.
fn select_preferred_candidate(candidates: &[ConversionCandidate]) -> &ConversionCandidate {
    candidates
        .iter()
        .min_by(|left, right| {
            source_extension_rank(&left.source_path)
                .cmp(&source_extension_rank(&right.source_path))
                .then_with(|| compare_source_names(&left.source_path, &right.source_path))
        })
        .expect("candidate groups are never empty")
}

/// Converts one source read into all requested output formats.
fn convert_task(input_dir: &Path, task: &ConversionTask) -> TaskReport {
    let source_file = input_dir.join(&task.source_path);
    let source = match fs::read(&source_file) {
        Ok(source) => source,
        Err(error) => return task_read_failure(task, error),
    };
    let mut report = TaskReport::default();

    for output in &task.outputs {
        let conversion = encode_font(&source, output.format)
            .map_err(|error| error.to_string())
            .and_then(|font| {
                write_atomically(&output.output_path, &font).map_err(|error| error.to_string())
            });

        match conversion {
            Ok(()) => report.results.push(ConversionResult {
                source_path: task.source_path.clone(),
                format: output.format,
                output_path: output.output_path.clone(),
                status: ConversionStatus::Succeeded,
            }),
            Err(error) => {
                report.results.push(ConversionResult {
                    source_path: task.source_path.clone(),
                    format: output.format,
                    output_path: output.output_path.clone(),
                    status: ConversionStatus::Failed,
                });
                report.failures.push(ConversionFailure {
                    source_path: task.source_path.clone(),
                    format: output.format,
                    output_path: output.output_path.clone(),
                    message: error.to_string(),
                });
            }
        }
    }

    report
}

/// Builds a per-format failure result when one source cannot be read.
fn task_read_failure(task: &ConversionTask, error: std::io::Error) -> TaskReport {
    let mut report = TaskReport::default();
    for output in &task.outputs {
        report.results.push(ConversionResult {
            source_path: task.source_path.clone(),
            format: output.format,
            output_path: output.output_path.clone(),
            status: ConversionStatus::Failed,
        });
        report.failures.push(ConversionFailure {
            source_path: task.source_path.clone(),
            format: output.format,
            output_path: output.output_path.clone(),
            message: format!(
                "failed to read source {}: {error}",
                task.source_path.display()
            ),
        });
    }
    report
}

/// Writes a file via a unique temporary sibling and atomic rename.
fn write_atomically(destination: &Path, contents: &[u8]) -> Result<(), std::io::Error> {
    write_atomically_with_counter(destination, contents, || {
        TEMPORARY_FILE_COUNTER.fetch_add(1, Ordering::Relaxed)
    })
}

/// Writes a file atomically while retrying an already-occupied temporary name.
fn write_atomically_with_counter(
    destination: &Path,
    contents: &[u8],
    mut next_counter: impl FnMut() -> u64,
) -> Result<(), std::io::Error> {
    let parent = destination.parent().unwrap_or_else(|| Path::new("."));
    fs::create_dir_all(parent)?;
    let file_name = destination
        .file_name()
        .unwrap_or_default()
        .to_string_lossy();
    for _ in 0..16 {
        let counter = next_counter();
        let temporary = parent.join(format!(
            ".{file_name}.{}.{}.tmp",
            std::process::id(),
            counter
        ));
        let mut file: File = match OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary)
        {
            Ok(file) => file,
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(error),
        };
        let write_result = (|| {
            file.write_all(contents)?;
            file.sync_all()?;
            replace_file(&temporary, destination)
        })();

        if write_result.is_err() {
            let _ = fs::remove_file(&temporary);
        }
        return write_result;
    }

    Err(std::io::Error::new(
        std::io::ErrorKind::AlreadyExists,
        "could not allocate a unique temporary output file",
    ))
}

/// Renames a completed temporary file over the final destination.
///
/// Platform rename semantics are delegated to the operating system. On Windows,
/// an existing open destination can reject replacement; that error preserves the
/// prior artifact and leaves no partial replacement.
fn replace_file(temporary: &Path, destination: &Path) -> Result<(), std::io::Error> {
    fs::rename(temporary, destination)
}

/// Reserves all destination paths for one in-process conversion operation.
fn reserve_destinations(
    tasks: &[ConversionTask],
) -> Result<DestinationReservation, ConvertDirectoryError> {
    let paths = tasks
        .iter()
        .flat_map(|task| task.outputs.iter().map(|output| &output.output_path))
        .map(|path| normalize_destination_path(path))
        .collect::<Result<BTreeSet<_>, _>>()?;
    let mut active = ACTIVE_DESTINATIONS
        .lock()
        .unwrap_or_else(|error| error.into_inner());

    if let Some(output_path) = paths.iter().find(|path| active.contains(*path)) {
        return Err(ConvertDirectoryError::OverlappingDestination {
            output_path: output_path.clone(),
        });
    }
    active.extend(paths.iter().cloned());
    Ok(DestinationReservation { paths })
}

/// Resolves existing ancestors so equivalent and symlinked output paths share a reservation key.
fn normalize_destination_path(destination: &Path) -> Result<PathBuf, ConvertDirectoryError> {
    let absolute_destination = if destination.is_absolute() {
        destination.to_path_buf()
    } else {
        std::env::current_dir()
            .map_err(|source| ConvertDirectoryError::DestinationResolution {
                output_path: destination.to_path_buf(),
                source,
            })?
            .join(destination)
    };
    let lexical_destination = normalize_lexical_path(&absolute_destination);
    let mut existing_ancestor = lexical_destination.as_path();
    let mut missing_segments = Vec::new();

    while !existing_ancestor.exists() {
        let file_name = existing_ancestor.file_name().ok_or_else(|| {
            ConvertDirectoryError::DestinationResolution {
                output_path: destination.to_path_buf(),
                source: std::io::Error::new(
                    std::io::ErrorKind::NotFound,
                    "destination has no existing ancestor",
                ),
            }
        })?;
        missing_segments.push(file_name.to_owned());
        existing_ancestor = existing_ancestor.parent().ok_or_else(|| {
            ConvertDirectoryError::DestinationResolution {
                output_path: destination.to_path_buf(),
                source: std::io::Error::new(
                    std::io::ErrorKind::NotFound,
                    "destination has no existing ancestor",
                ),
            }
        })?;
    }
    let mut normalized = existing_ancestor.canonicalize().map_err(|source| {
        ConvertDirectoryError::DestinationResolution {
            output_path: destination.to_path_buf(),
            source,
        }
    })?;
    for segment in missing_segments.iter().rev() {
        normalized.push(segment);
    }
    Ok(normalized)
}

/// Removes current-directory and parent-directory components before canonicalization.
fn normalize_lexical_path(path: &Path) -> PathBuf {
    let mut normalized = PathBuf::new();

    for component in path.components() {
        match component {
            std::path::Component::CurDir => {}
            std::path::Component::ParentDir => {
                normalized.pop();
            }
            _ => normalized.push(component.as_os_str()),
        }
    }

    normalized
}

/// Releases destination ownership when a conversion operation completes.
struct DestinationReservation {
    paths: BTreeSet<PathBuf>,
}

impl Drop for DestinationReservation {
    fn drop(&mut self) {
        let mut active = ACTIVE_DESTINATIONS
            .lock()
            .unwrap_or_else(|error| error.into_inner());
        for path in &self.paths {
            active.remove(path);
        }
    }
}

/// Removes duplicate output formats while preserving caller order.
fn unique_formats(formats: &[OutputFormat]) -> Vec<OutputFormat> {
    let mut seen = BTreeSet::new();
    formats
        .iter()
        .copied()
        .filter(|format| seen.insert(*format))
        .collect()
}

/// Returns the TypeScript-compatible lowercased hyphenated source basename.
fn normalize_source_basename(source_path: &Path) -> String {
    crate::naming::to_hyphenated(
        source_path
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or_default(),
    )
}

/// Returns a rank preferring TTF sources over OTF sources.
fn source_extension_rank(source_path: &Path) -> u8 {
    match source_path
        .extension()
        .and_then(|extension| extension.to_str())
    {
        Some(extension) if extension.eq_ignore_ascii_case("ttf") => 0,
        _ => 1,
    }
}

/// Returns the final component for deterministic warning labels.
fn display_source_name(path: &Path) -> String {
    path.file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned()
}

/// Compares source names like Node's default locale comparison.
///
/// Unicode case-insensitive comparison is primary; when names differ only by case,
/// lowercase characters sort before uppercase characters (`a.otf` before
/// `A.otf`), matching the Node runtime used by the compatibility oracle.
fn compare_source_names(left: &Path, right: &Path) -> std::cmp::Ordering {
    let left_name = display_source_name(left);
    let right_name = display_source_name(right);
    left_name
        .to_lowercase()
        .cmp(&right_name.to_lowercase())
        .then_with(|| right_name.cmp(&left_name))
}

/// Orders results by source relative path then output format.
fn compare_result(left: &ConversionResult, right: &ConversionResult) -> std::cmp::Ordering {
    left.source_path
        .cmp(&right.source_path)
        .then(left.format.cmp(&right.format))
}

/// Orders failures by source relative path then output format.
fn compare_failure(left: &ConversionFailure, right: &ConversionFailure) -> std::cmp::Ordering {
    left.source_path
        .cmp(&right.source_path)
        .then(left.format.cmp(&right.format))
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::Path;
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::{
        ConversionCandidate, ConversionOutput, ConversionStatus, ConversionTask,
        ConvertDirectoryError, ConvertDirectoryOptions, convert_fonts_in_dir,
        normalize_destination_path, reserve_destinations, select_preferred_candidate,
        write_atomically_with_counter,
    };
    use crate::domain::OutputFormat;

    const TTF: &[u8] = include_bytes!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../fonts-sample/input/ubuntu-mono/UbuntuMonoNerdFont-Regular.ttf"
    ));
    const OTF: &[u8] = include_bytes!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../fonts-sample/input/akrobat/Akrobat-Regular.otf"
    ));

    #[test]
    fn convert_fonts_in_dir_writes_both_formats_with_one_worker() {
        let root = temporary_directory("single-worker");
        let input = root.join("input");
        let output = root.join("output");
        write_file(&input.join("family/Family-Regular.TTF"), TTF);
        let mut options = ConvertDirectoryOptions::new(&output);
        options.worker_count = 1;

        let report = convert_fonts_in_dir(&input, &options).expect("convert font");

        assert_eq!(report.warnings, Vec::<String>::new());
        assert_eq!(report.failures.len(), 0);
        assert_eq!(report.results.len(), 2);
        assert!(
            report
                .results
                .iter()
                .all(|result| result.status == ConversionStatus::Succeeded)
        );
        assert!(
            output
                .join("family/family-regular.woff")
                .starts_with_bytes(b"wOFF")
        );
        assert!(
            output
                .join("family/family-regular.woff2")
                .starts_with_bytes(b"wOF2")
        );
        assert_no_temporary_files(&output);

        remove_directory(root);
    }

    #[cfg(not(windows))]
    #[test]
    fn convert_fonts_in_dir_replaces_existing_outputs() {
        let root = temporary_directory("replace-output");
        let input = root.join("input");
        let output = root.join("output");
        write_file(&input.join("family/Family-Regular.ttf"), TTF);
        let mut options = ConvertDirectoryOptions::new(&output);
        options.formats = vec![OutputFormat::Woff];

        convert_fonts_in_dir(&input, &options).expect("first conversion");
        convert_fonts_in_dir(&input, &options).expect("replacement conversion");

        assert!(
            output
                .join("family/family-regular.woff")
                .starts_with_bytes(b"wOFF")
        );
        assert_no_temporary_files(&output);

        remove_directory(root);
    }

    #[test]
    fn convert_fonts_in_dir_prefers_ttf_for_colliding_normalized_outputs() {
        let root = temporary_directory("collision");
        let input = root.join("input");
        let output = root.join("output");
        write_file(&input.join("family/Family-Regular.ttf"), TTF);
        write_file(&input.join("family/family_regular.otf"), OTF);
        let mut options = ConvertDirectoryOptions::new(&output);
        options.formats = vec![OutputFormat::Woff];

        let report = convert_fonts_in_dir(&input, &options).expect("convert preferred source");

        assert_eq!(report.results.len(), 1);
        assert_eq!(
            report.results[0].source_path,
            Path::new("family/Family-Regular.ttf")
        );
        assert_eq!(report.warnings.len(), 1);
        assert!(report.warnings[0].contains("family_regular.otf"));
        assert!(report.warnings[0].contains("Family-Regular.ttf"));

        remove_directory(root);
    }

    #[test]
    fn select_preferred_candidate_uses_node_compatible_case_order() {
        let candidates = [
            ConversionCandidate {
                source_path: Path::new("family/A.otf").to_path_buf(),
                format: OutputFormat::Woff,
                output_path: Path::new("output/family/a.woff").to_path_buf(),
            },
            ConversionCandidate {
                source_path: Path::new("family/a.otf").to_path_buf(),
                format: OutputFormat::Woff,
                output_path: Path::new("output/family/a.woff").to_path_buf(),
            },
        ];

        assert_eq!(
            select_preferred_candidate(&candidates).source_path,
            Path::new("family/a.otf")
        );
    }

    #[test]
    fn select_preferred_candidate_uses_node_compatible_unicode_case_order() {
        let candidates = [
            ConversionCandidate {
                source_path: Path::new("family/É.otf").to_path_buf(),
                format: OutputFormat::Woff,
                output_path: Path::new("output/family/e.woff").to_path_buf(),
            },
            ConversionCandidate {
                source_path: Path::new("family/é.otf").to_path_buf(),
                format: OutputFormat::Woff,
                output_path: Path::new("output/family/e.woff").to_path_buf(),
            },
        ];

        assert_eq!(
            select_preferred_candidate(&candidates).source_path,
            Path::new("family/é.otf")
        );
    }

    #[test]
    fn convert_fonts_in_dir_reports_failures_after_parallel_work_completes() {
        let root = temporary_directory("partial-failure");
        let input = root.join("input");
        let output = root.join("output");
        write_file(&input.join("family/Good.TTF"), TTF);
        write_file(&input.join("family/Bad.ttf"), b"not a font");
        let mut options = ConvertDirectoryOptions::new(&output);
        options.formats = vec![OutputFormat::Woff];
        options.worker_count = 2;

        let error = convert_fonts_in_dir(&input, &options).expect_err("report partial failure");

        let ConvertDirectoryError::PartialFailure { count, report } = error else {
            panic!("expected partial failure");
        };
        assert_eq!(count, 1);
        assert_eq!(report.results.len(), 2);
        assert_eq!(report.failures.len(), 1);
        assert_eq!(report.failures[0].source_path, Path::new("family/Bad.ttf"));
        assert!(output.join("family/good.woff").starts_with_bytes(b"wOFF"));
        assert_no_temporary_files(&output);

        remove_directory(root);
    }

    #[test]
    fn convert_fonts_in_dir_is_deterministic_with_multiple_workers() {
        let root = temporary_directory("parallel");
        let input = root.join("input");
        let output = root.join("output");
        for index in 0..4 {
            write_file(&input.join(format!("family/Family-{index:02}.otf")), OTF);
        }
        let mut options = ConvertDirectoryOptions::new(&output);
        options.formats = vec![OutputFormat::Woff];
        options.worker_count = 4;

        let report = convert_fonts_in_dir(&input, &options).expect("convert parallel fonts");

        assert_eq!(report.results.len(), 4);
        assert_eq!(report.failures.len(), 0);
        assert_eq!(
            report
                .results
                .iter()
                .map(|result| result.source_path.clone())
                .collect::<Vec<_>>(),
            (0..4)
                .map(|index| Path::new(&format!("family/Family-{index:02}.otf")).to_path_buf())
                .collect::<Vec<_>>()
        );
        assert_no_temporary_files(&output);

        remove_directory(root);
    }

    #[test]
    fn write_atomically_retries_a_preexisting_temporary_name_without_removing_it() {
        let root = temporary_directory("temporary-collision");
        let destination = root.join("font.woff");
        let stale_temporary = root.join(format!(".font.woff.{}.0.tmp", std::process::id()));
        fs::write(&stale_temporary, b"stale").expect("write stale temporary file");
        let mut counter = 0;

        write_atomically_with_counter(&destination, b"replacement", || {
            let current = counter;
            counter += 1;
            current
        })
        .expect("retry temporary file name");

        assert_eq!(
            fs::read(&stale_temporary).expect("read stale file"),
            b"stale"
        );
        assert_eq!(
            fs::read(&destination).expect("read destination"),
            b"replacement"
        );

        remove_directory(root);
    }

    #[test]
    fn reserve_destinations_rejects_overlapping_in_process_conversions() {
        let destination = Path::new("output/family/font.woff").to_path_buf();
        let task = ConversionTask {
            source_path: Path::new("family/font.ttf").to_path_buf(),
            outputs: vec![ConversionOutput {
                format: OutputFormat::Woff,
                output_path: destination.clone(),
            }],
        };
        let reservation =
            reserve_destinations(std::slice::from_ref(&task)).expect("reserve destination");

        let normalized_destination =
            normalize_destination_path(&destination).expect("normalize destination");
        assert!(matches!(
            reserve_destinations(std::slice::from_ref(&task)),
            Err(ConvertDirectoryError::OverlappingDestination { output_path }) if output_path == normalized_destination
        ));
        drop(reservation);
        assert!(reserve_destinations(&[task]).is_ok());
    }

    #[test]
    fn reserve_destinations_normalizes_equivalent_output_paths() {
        let root = temporary_directory("destination-alias");
        let first_destination = root.join("out/family/font.woff");
        let second_destination = root.join("out/../out/family/font.woff");
        let first_task = task_for_destination(first_destination);
        let second_task = task_for_destination(second_destination);
        let reservation = reserve_destinations(&[first_task]).expect("reserve first destination");

        assert!(matches!(
            reserve_destinations(&[second_task]),
            Err(ConvertDirectoryError::OverlappingDestination { .. })
        ));

        drop(reservation);
        remove_directory(root);
    }

    #[cfg(unix)]
    #[test]
    fn reserve_destinations_normalizes_symlinked_output_paths() {
        use std::os::unix::fs::symlink;

        let root = temporary_directory("destination-symlink");
        let output = root.join("out");
        let output_link = root.join("out-link");
        fs::create_dir_all(&output).expect("create output directory");
        symlink(&output, &output_link).expect("create output symlink");
        let first_task = task_for_destination(output.join("family/font.woff"));
        let second_task = task_for_destination(output_link.join("family/font.woff"));
        let reservation = reserve_destinations(&[first_task]).expect("reserve first destination");

        assert!(matches!(
            reserve_destinations(&[second_task]),
            Err(ConvertDirectoryError::OverlappingDestination { .. })
        ));

        drop(reservation);
        remove_directory(root);
    }

    #[test]
    fn convert_fonts_in_dir_rejects_an_output_inside_input() {
        let root = temporary_directory("unsafe-output");
        let input = root.join("input");
        write_file(&input.join("family/Font.ttf"), TTF);
        let options = ConvertDirectoryOptions::new(input.join("generated"));

        assert!(matches!(
            convert_fonts_in_dir(&input, &options),
            Err(ConvertDirectoryError::InvalidOutput { .. })
        ));

        remove_directory(root);
    }

    fn task_for_destination(output_path: std::path::PathBuf) -> ConversionTask {
        ConversionTask {
            source_path: Path::new("family/font.ttf").to_path_buf(),
            outputs: vec![ConversionOutput {
                format: OutputFormat::Woff,
                output_path,
            }],
        }
    }

    fn temporary_directory(name: &str) -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time after epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("nexus-webfont-convert-{name}-{unique}"));
        fs::create_dir_all(&path).expect("create temporary directory");
        path
    }

    fn write_file(path: &Path, contents: &[u8]) {
        fs::create_dir_all(path.parent().expect("file parent")).expect("create file parent");
        fs::write(path, contents).expect("write fixture");
    }

    fn assert_no_temporary_files(root: &Path) {
        for entry in walkdir::WalkDir::new(root).min_depth(1) {
            let entry = entry.expect("walk output");
            assert!(
                !entry.file_name().to_string_lossy().ends_with(".tmp"),
                "temporary file remains: {}",
                entry.path().display()
            );
        }
    }

    fn remove_directory(path: std::path::PathBuf) {
        fs::remove_dir_all(path).expect("remove temporary directory");
    }

    trait PathBytes {
        fn starts_with_bytes(&self, expected: &[u8]) -> bool;
    }

    impl PathBytes for std::path::PathBuf {
        fn starts_with_bytes(&self, expected: &[u8]) -> bool {
            fs::read(self)
                .map(|contents| contents.starts_with(expected))
                .unwrap_or(false)
        }
    }
}
