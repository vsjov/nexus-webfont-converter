//! Optional progress events emitted by the native conversion pipeline.

use std::path::PathBuf;

/// A lifecycle event that can be rendered by a native CLI or another observer.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProgressEvent {
    /// The output directory was prepared for a full conversion run.
    OutputCleaned,
    /// A bounded conversion worker started processing one source font.
    WorkerStarted {
        /// One-based Rayon worker slot.
        slot: usize,
        /// Source font filename.
        source_name: String,
    },
    /// A worker started encoding one output container.
    WorkerStatus {
        /// One-based Rayon worker slot.
        slot: usize,
        /// Source font filename.
        source_name: String,
        /// Uppercase output container name.
        format: String,
    },
    /// A worker completed one output container attempt.
    ConversionFinished {
        /// One-based Rayon worker slot.
        slot: usize,
        /// Source font filename.
        source_name: String,
        /// Generated output filename.
        output_name: String,
        /// Whether the output was written successfully.
        succeeded: bool,
    },
    /// A worker has no remaining work for its current source font.
    WorkerFinished {
        /// One-based Rayon worker slot.
        slot: usize,
    },
    /// A supported license was copied into the output tree.
    LicenseCopied {
        /// Destination path of the copied license.
        output_path: PathBuf,
    },
    /// A per-family SCSS artifact was generated.
    ScssGenerated {
        /// Generated SCSS path.
        output_path: PathBuf,
    },
    /// CSS compilation completed.
    CssCompiled,
    /// A per-family HTML preview was generated.
    HtmlGenerated {
        /// Generated HTML path.
        output_path: PathBuf,
    },
}

/// Receives thread-safe native conversion progress events.
pub trait ProgressObserver: Send + Sync {
    /// Receives one pipeline or conversion lifecycle event.
    fn on_progress(&self, event: ProgressEvent);
}
