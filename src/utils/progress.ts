// Imports
// -----------------------------------------------------------------------------
// External
import cliProgress from 'cli-progress'
import pc from 'picocolors'

// Types
import type { SingleBar } from 'cli-progress'

// Types
// -----------------------------------------------------------------------------
/**
 * Callbacks injected into pipeline steps to report progress and warnings
 * without coupling them to a specific output mechanism.
 */
export type ProgressOptions = {
  /** Called when the active pipeline status changes without completing a step. */
  onStatus?: (label: string) => void

  /** Called when a bounded worker slot starts processing an item. */
  onWorkerStart?: (slot: number, label: string) => void

  /** Called when a bounded worker slot changes status. */
  onWorkerStatus?: (slot: number, label: string) => void

  /** Called when a bounded worker slot finishes processing an item. */
  onWorkerDone?: (slot: number, label: string) => void

  /** Called after each completed pipeline step with a human-readable label. */
  onProgress?: (label: string) => void

  /** Called when a non-fatal issue is encountered (e.g. missing files). */
  onWarn?: (message: string) => void
}

/**
 * Interface returned by `createProgress` for advancing the progress bar.
 */
export type ProgressReporter = {
  /** Updates the displayed label without advancing the progress bar. */
  update: (label: string) => void

  /** Shows a worker slot as active. */
  startWorker: (slot: number, label: string) => void

  /** Updates an active worker slot. */
  updateWorker: (slot: number, label: string) => void

  /** Marks a worker slot as complete and removes it from the display. */
  stopWorker: (slot: number, label: string) => void

  /** Advances the progress bar by one step and updates the displayed label. */
  tick: (label: string) => void
}

type WorkerBarState = {
  bar: SingleBar
}

// Function
// -----------------------------------------------------------------------------
/**
 * Creates a `cli-progress` bar pre-configured for the conversion pipeline.
 *
 * @param total - Total number of steps the pipeline will execute
 * @returns A reporter with `tick`, `warn`, and `stop` methods
 */
const createProgress = (
  total: number,
): ProgressReporter & { stop: (finalLabel?: string) => void } => {
  const bars = new cliProgress.MultiBar(
    {
      format: `${pc.cyan('{bar}')} {percentage}% | {value}/{total} | {label}`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
      clearOnComplete: false,
      stopOnComplete: false,
    },
    cliProgress.Presets.shades_classic,
  )
  const overallBar = bars.create(total, 0, { label: 'Starting...' })
  const workerBars = new Map<number, WorkerBarState>()

  /**
   * Creates or updates the progress row for a worker slot.
   *
   * @param slot - Zero-based worker slot index
   * @param label - Worker status label
   * @returns Worker bar state for the slot
   */
  const upsertWorkerBar = (slot: number, label: string): WorkerBarState => {
    const existingBar = workerBars.get(slot)
    const payload = {
      label,
      slot: slot + 1,
    }

    if (existingBar) {
      existingBar.bar.update(0, payload)

      return existingBar
    }

    const bar = bars.create(1, 0, payload, {
      format: `${pc.gray('Worker {slot}')} | {duration_formatted} | {label}`,
    })
    const state = { bar }
    workerBars.set(slot, state)

    return state
  }

  return {
    update: (label: string) => {
      overallBar.update({ label })
    },
    startWorker: (slot: number, label: string) => {
      upsertWorkerBar(slot, label)
    },
    updateWorker: (slot: number, label: string) => {
      upsertWorkerBar(slot, label)
    },
    stopWorker: (slot: number, label: string) => {
      const workerBar = workerBars.get(slot) ?? upsertWorkerBar(slot, label)

      workerBar.bar.update(1, {
        label,
        slot: slot + 1,
      })
      bars.remove(workerBar.bar)
      workerBars.delete(slot)
    },
    tick: (label: string) => {
      overallBar.increment({ label })
    },
    stop: (finalLabel?: string) => {
      for (const [slot, workerBar] of workerBars) {
        workerBar.bar.update(1, {
          label: 'Stopped',
          slot: slot + 1,
        })
        bars.remove(workerBar.bar)
      }
      workerBars.clear()

      if (finalLabel) {
        overallBar.update(overallBar.getTotal(), { label: finalLabel })
      }

      bars.stop()
    },
  }
}

export default createProgress
