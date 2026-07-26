//! Terminal rendering for native pipeline progress events.

use std::collections::BTreeMap;
use std::io::{self, IsTerminal, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Instant;

use nexus_webfont_core::progress::{ProgressEvent, ProgressObserver};
use terminal_size::{Height, terminal_size};

const BAR_WIDTH: usize = 40;
const DURATION_WIDTH: usize = 6;

/// Renders native pipeline events in the same overall and worker-row layout as Node.
pub struct NativeProgressRenderer {
    state: Arc<Mutex<ProgressState>>,
    redraw_active: Arc<AtomicBool>,
    redraw_thread: Option<std::thread::JoinHandle<()>>,
}

struct ProgressState {
    total: usize,
    completed: usize,
    label: String,
    worker_width: usize,
    workers: BTreeMap<usize, WorkerState>,
    interactive: bool,
    show_workers: bool,
    last_lines: Vec<String>,
    rendered_lines: usize,
}

struct WorkerState {
    label: String,
    started_at: Instant,
}

impl NativeProgressRenderer {
    /// Creates a renderer for a complete conversion pipeline.
    #[must_use]
    pub fn new(total: usize, worker_count: usize) -> Self {
        let interactive = io::stderr().is_terminal();
        let show_workers = can_show_worker_rows(interactive, terminal_rows(), worker_count);
        let state = Arc::new(Mutex::new(ProgressState {
            total,
            completed: 0,
            label: "Starting...".to_owned(),
            worker_width: worker_count.max(1).to_string().len(),
            workers: BTreeMap::new(),
            interactive,
            show_workers,
            last_lines: Vec::new(),
            rendered_lines: 0,
        }));
        let redraw_active = Arc::new(AtomicBool::new(interactive));
        if interactive {
            let _ = io::stderr().write_all(b"\x1b[?25l");
        }
        let redraw_thread = spawn_redraw_thread(state.clone(), redraw_active.clone());
        let renderer = Self {
            state,
            redraw_active,
            redraw_thread,
        };
        renderer.redraw();
        renderer
    }

    /// Completes the overall progress row and restores terminal cursor state.
    pub fn finish(mut self, label: &str) {
        self.redraw_active.store(false, Ordering::Release);
        if let Some(redraw_thread) = self.redraw_thread.take() {
            let _ = redraw_thread.join();
        }
        let mut state = lock_state(&self.state);
        state.completed = state.total;
        state.label = label.to_owned();
        state.workers.clear();
        render(&mut state);
        if state.interactive {
            let _ = io::stderr().write_all(b"\x1b[?25h");
        }
    }

    fn redraw(&self) {
        let mut state = lock_state(&self.state);
        render(&mut state);
    }
}

fn spawn_redraw_thread(
    state: Arc<Mutex<ProgressState>>,
    redraw_active: Arc<AtomicBool>,
) -> Option<std::thread::JoinHandle<()>> {
    if !redraw_active.load(Ordering::Acquire) {
        return None;
    }
    Some(std::thread::spawn(move || {
        while redraw_active.load(Ordering::Acquire) {
            std::thread::sleep(std::time::Duration::from_millis(100));
            if !redraw_active.load(Ordering::Acquire) {
                break;
            }
            let mut state = lock_state(&state);
            if !state.workers.is_empty() {
                render(&mut state);
            }
        }
    }))
}

impl ProgressObserver for NativeProgressRenderer {
    fn on_progress(&self, event: ProgressEvent) {
        let mut state = lock_state(&self.state);
        match event {
            ProgressEvent::OutputCleaned => complete_step(&mut state, "Cleaned output directory"),
            ProgressEvent::WorkerStarted { slot, source_name } => {
                if !state.show_workers {
                    return;
                }
                state.workers.insert(
                    slot,
                    WorkerState {
                        label: format!("Starting {}", blue(&source_name)),
                        started_at: Instant::now(),
                    },
                );
            }
            ProgressEvent::WorkerStatus {
                slot,
                source_name,
                format,
            } => {
                if let Some(worker) = state.workers.get_mut(&slot) {
                    worker.label = format!("Converting {} to {format}", blue(&source_name));
                }
            }
            ProgressEvent::ConversionFinished {
                slot,
                source_name,
                output_name,
                succeeded,
            } => {
                let label = if succeeded {
                    format!(
                        "Generated {} from {}",
                        green(&output_name),
                        blue(&source_name)
                    )
                } else {
                    format!("Failed {} from {}", green(&output_name), blue(&source_name))
                };
                complete_step(&mut state, &label);
                if let Some(worker) = state.workers.get_mut(&slot) {
                    worker.label = label;
                }
            }
            ProgressEvent::WorkerFinished { slot } => {
                state.workers.remove(&slot);
            }
            ProgressEvent::LicenseCopied { output_path } => complete_step(
                &mut state,
                &format!("Copied license {}", green(&display_name(&output_path))),
            ),
            ProgressEvent::ScssGenerated { output_path } => complete_step(
                &mut state,
                &format!("Generated {}", green(&display_name(&output_path))),
            ),
            ProgressEvent::CssCompiled => complete_step(&mut state, "Compiled CSS"),
            ProgressEvent::HtmlGenerated { output_path } => complete_step(
                &mut state,
                &format!("Generated {}", green(&display_name(&output_path))),
            ),
        }
        render(&mut state);
    }
}

fn lock_state(state: &Mutex<ProgressState>) -> std::sync::MutexGuard<'_, ProgressState> {
    state.lock().unwrap_or_else(|error| error.into_inner())
}

fn complete_step(state: &mut ProgressState, label: &str) {
    state.completed = state.completed.saturating_add(1).min(state.total);
    state.label = label.to_owned();
}

fn display_name(path: &std::path::Path) -> String {
    path.file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned()
}

fn terminal_rows() -> Option<usize> {
    terminal_size().map(|(_, Height(rows))| usize::from(rows))
}

fn can_show_worker_rows(interactive: bool, rows: Option<usize>, worker_capacity: usize) -> bool {
    interactive && rows.is_none_or(|rows| rows >= worker_capacity.saturating_add(1))
}

fn render(state: &mut ProgressState) {
    if !state.interactive {
        return;
    }
    let lines = render_lines(state);
    if lines == state.last_lines {
        return;
    }
    let mut stderr = io::stderr().lock();
    if state.rendered_lines > 0 {
        let _ = write!(stderr, "\x1b[{}A", state.rendered_lines);
    }
    for line in &lines {
        let _ = write!(stderr, "\r\x1b[2K{line}\n");
    }
    for _ in lines.len()..state.rendered_lines {
        let _ = write!(stderr, "\r\x1b[2K\n");
    }
    let _ = stderr.flush();
    state.rendered_lines = state.rendered_lines.max(lines.len());
    state.last_lines = lines;
}

fn render_lines(state: &ProgressState) -> Vec<String> {
    let completed_width = state.completed.saturating_mul(BAR_WIDTH) / state.total.max(1);
    let bar = format!(
        "{}{}",
        "█".repeat(completed_width),
        "░".repeat(BAR_WIDTH.saturating_sub(completed_width))
    );
    let percentage = state.completed.saturating_mul(100) / state.total.max(1);
    let mut lines = vec![format!(
        "{} {percentage}% | {}/{} | {}",
        cyan(&bar),
        state.completed,
        state.total,
        state.label
    )];
    if state.show_workers {
        lines.extend(state.workers.iter().map(|(slot, worker)| {
            let elapsed = format_elapsed_duration(worker.started_at.elapsed().as_secs());
            format!(
                "{} {:>width$} | {elapsed} | {}",
                gray("Worker"),
                slot,
                worker.label,
                width = state.worker_width
            )
        }));
    }
    lines
}

fn cyan(value: &str) -> String {
    format!("\x1b[36m{value}\x1b[0m")
}

fn gray(value: &str) -> String {
    format!("\x1b[90m{value}\x1b[0m")
}

fn green(value: &str) -> String {
    format!("\x1b[32m{value}\x1b[0m")
}

fn blue(value: &str) -> String {
    format!("\x1b[34m{value}\x1b[0m")
}

fn format_elapsed_duration(duration_seconds: u64) -> String {
    let (value, suffix) = if duration_seconds < 60 {
        (duration_seconds as f64, "s")
    } else if duration_seconds < 60 * 60 {
        (duration_seconds as f64 / 60.0, "m")
    } else if duration_seconds < 24 * 60 * 60 {
        (duration_seconds as f64 / (60.0 * 60.0), "h")
    } else {
        (duration_seconds as f64 / (24.0 * 60.0 * 60.0), "d")
    };
    let number = if value < 10.0 && value.fract() > f64::EPSILON {
        format!("{value:.1}").replace('.', ",")
    } else {
        value.round().to_string()
    };
    format!("{number}{suffix}").pad_width(DURATION_WIDTH)
}

trait PadWidth {
    fn pad_width(self, width: usize) -> String;
}

impl PadWidth for String {
    fn pad_width(self, width: usize) -> String {
        format!("{self:>width$}")
    }
}

#[cfg(test)]
mod tests {
    use super::{DURATION_WIDTH, can_show_worker_rows, format_elapsed_duration};

    #[test]
    fn format_elapsed_duration_uses_fixed_width_adaptive_units() {
        assert_eq!(format_elapsed_duration(12), "   12s");
        assert_eq!(format_elapsed_duration(90), "  1,5m");
        assert_eq!(format_elapsed_duration(60 * 60), "    1h");
        assert_eq!(format_elapsed_duration(90 * 60), "  1,5h");
        assert_eq!(format_elapsed_duration(36 * 60 * 60), "  1,5d");
        assert!(format_elapsed_duration(90).len() == DURATION_WIDTH);
    }

    #[test]
    fn can_show_worker_rows_requires_enough_terminal_height() {
        assert!(!can_show_worker_rows(true, Some(32), 32));
        assert!(can_show_worker_rows(true, Some(33), 32));
        assert!(!can_show_worker_rows(false, Some(100), 32));
    }
}
