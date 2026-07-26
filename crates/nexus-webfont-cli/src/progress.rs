//! Terminal rendering for native pipeline progress events.

use std::collections::BTreeMap;
use std::io::{self, IsTerminal, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use nexus_webfont_core::progress::{ProgressEvent, ProgressObserver};
use terminal_size::{Height, terminal_size};

const BAR_WIDTH: usize = 40;
const DURATION_WIDTH: usize = 6;
/// Caps terminal writes below the 60 FPS threshold while coalescing worker events.
const FRAME_INTERVAL: Duration = Duration::from_millis(17);

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
    dirty: bool,
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
            dirty: true,
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
        mark_dirty(&mut state);
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
            std::thread::sleep(FRAME_INTERVAL);
            if !redraw_active.load(Ordering::Acquire) {
                break;
            }
            let mut state = lock_state(&state);
            if !state.workers.is_empty() {
                mark_dirty(&mut state);
            }
            render(&mut state);
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
        mark_dirty(&mut state);
    }
}

fn lock_state(state: &Mutex<ProgressState>) -> std::sync::MutexGuard<'_, ProgressState> {
    state.lock().unwrap_or_else(|error| error.into_inner())
}

fn complete_step(state: &mut ProgressState, label: &str) {
    state.completed = state.completed.saturating_add(1).min(state.total);
    state.label = label.to_owned();
}

/// Marks a changed progress state for the next coalesced terminal frame.
fn mark_dirty(state: &mut ProgressState) {
    state.dirty = true;
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
    if !state.interactive || !state.dirty {
        return;
    }
    let lines = render_lines(state);
    if lines == state.last_lines {
        state.dirty = false;
        return;
    }
    let mut stderr = io::stderr().lock();
    render_to(&mut stderr, state, &lines);
    let _ = stderr.flush();
    state.last_lines = lines;
    state.dirty = false;
}

/// Writes one complete terminal frame and collapses any rows removed from it.
fn render_to(output: &mut impl Write, state: &mut ProgressState, lines: &[String]) {
    if state.rendered_lines > 0 {
        let _ = write!(output, "\x1b[{}A", state.rendered_lines);
    }
    for line in lines {
        let _ = write!(output, "\r\x1b[2K{line}\n");
    }
    let removed_lines = removed_line_count(state.rendered_lines, lines.len());
    for _ in 0..removed_lines {
        let _ = write!(output, "\r\x1b[2K\n");
    }
    if removed_lines > 0 {
        let _ = write!(output, "\x1b[{removed_lines}A");
    }
    state.rendered_lines = lines.len();
}

/// Returns how many stale rows must be cleared after a smaller frame is written.
fn removed_line_count(previous_lines: usize, current_lines: usize) -> usize {
    previous_lines.saturating_sub(current_lines)
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
    use std::collections::BTreeMap;
    use std::time::Duration;

    use super::{
        DURATION_WIDTH, FRAME_INTERVAL, ProgressState, can_show_worker_rows,
        format_elapsed_duration, mark_dirty, render_to,
    };

    fn progress_state(rendered_lines: usize) -> ProgressState {
        ProgressState {
            total: 1,
            completed: 0,
            label: "Starting...".to_owned(),
            worker_width: 1,
            workers: BTreeMap::new(),
            interactive: true,
            show_workers: true,
            last_lines: Vec::new(),
            rendered_lines,
            dirty: false,
        }
    }

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

    #[test]
    fn render_to_collapses_removed_worker_rows() {
        let mut state = progress_state(3);
        let mut output = Vec::new();

        render_to(&mut output, &mut state, &["overall".to_owned()]);

        assert_eq!(state.rendered_lines, 1);
        assert_eq!(
            String::from_utf8(output).expect("rendered terminal frame"),
            "\x1b[3A\r\x1b[2Koverall\n\r\x1b[2K\n\r\x1b[2K\n\x1b[2A"
        );
    }

    #[test]
    fn progress_events_are_coalesced_below_sixty_frames_per_second() {
        let mut state = progress_state(0);

        mark_dirty(&mut state);

        assert!(state.dirty);
        assert!(FRAME_INTERVAL >= Duration::from_millis(1_000 / 60));
    }
}
