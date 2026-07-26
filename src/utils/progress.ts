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
  label: string
  startedAt: number
}

type InternalMultiBar = {
  bars: SingleBar[]
}

const DURATION_WIDTH = 6

/**
 * Returns whether the terminal can display the overall bar and every worker row.
 *
 * @param workerCount - Maximum number of concurrently active conversion workers
 * @returns `true` when the full worker table fits in the active terminal
 */
export const canShowWorkerRows = (workerCount: number): boolean => {
  return canShowWorkerRowsForTerminal(
    workerCount,
    process.stderr.isTTY,
    process.stderr.rows,
  )
}

/**
 * Determines whether a terminal can reserve rows for the complete worker table.
 *
 * @param workerCount - Maximum number of concurrently active conversion workers
 * @param isTTY - Whether the output stream is an interactive terminal
 * @param rows - Terminal height when available
 * @returns `true` when the overall row and every worker row fit
 */
export const canShowWorkerRowsForTerminal = (
  workerCount: number,
  isTTY: boolean | undefined,
  rows: number | undefined,
): boolean => isTTY === true && (rows === undefined || rows >= workerCount + 1)

/**
 * Formats a worker slot using the width of the configured worker pool.
 *
 * @param slot - One-based worker slot number
 * @param workerCount - Maximum number of concurrently active workers
 * @returns Right-aligned worker slot text
 */
export const formatWorkerSlot = (slot: number, workerCount: number): string =>
  String(slot).padStart(String(Math.max(1, workerCount)).length)

/**
 * Formats elapsed seconds into a fixed-width, compact duration cell.
 *
 * @param durationSeconds - Elapsed duration measured in seconds
 * @returns A six-character duration using seconds, minutes, hours, or days
 */
export const formatElapsedDuration = (durationSeconds: number): string => {
  const seconds = Math.max(0, Math.round(durationSeconds))
  const [value, suffix] =
    seconds < 60
      ? [seconds, 's']
      : seconds < 60 * 60
        ? [seconds / 60, 'm']
        : seconds < 24 * 60 * 60
          ? [seconds / (60 * 60), 'h']
          : [seconds / (24 * 60 * 60), 'd']
  const formattedValue =
    value < 10 && value % 1 !== 0
      ? value.toFixed(1).replace('.', ',')
      : String(Math.round(value))

  return `${formattedValue}${suffix}`.padStart(DURATION_WIDTH)
}

// Function
// -----------------------------------------------------------------------------
/**
 * Creates a `cli-progress` bar pre-configured for the conversion pipeline.
 *
 * @param total - Total number of steps the pipeline will execute
 * @param workerCount - Maximum number of concurrently active conversion workers
 * @returns A reporter with `tick`, `warn`, and `stop` methods
 */
const createProgress = (
  total: number,
  workerCount = 1,
): ProgressReporter & { stop: (finalLabel?: string) => void } => {
  const bars = new cliProgress.MultiBar(
    {
      format: `${pc.cyan('{bar}')} {percentage}% | {value}/{total} | {label}`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
      clearOnComplete: false,
      stopOnComplete: false,
      formatTime: formatElapsedDuration,
    },
    cliProgress.Presets.shades_classic,
  )
  const overallBar = bars.create(total, 0, { label: 'Starting...' })
  const workerBars = new Map<number, WorkerBarState>()
  const showWorkerRows = canShowWorkerRows(workerCount)

  const orderWorkerBars = () => {
    if (!showWorkerRows) return

    const internalBars = bars as unknown as InternalMultiBar
    internalBars.bars.splice(
      0,
      internalBars.bars.length,
      overallBar,
      ...Array.from(workerBars.entries())
        .sort(([left], [right]) => left - right)
        .map(([, workerBar]) => workerBar.bar),
    )
  }

  const workerPayload = (slot: number, label: string, startedAt: number) => ({
    elapsed: formatElapsedDuration((Date.now() - startedAt) / 1000),
    label,
    slot: formatWorkerSlot(slot + 1, workerCount),
  })

  const durationTimer = setInterval(() => {
    for (const [slot, workerBar] of workerBars) {
      workerBar.bar.update(
        0,
        workerPayload(slot, workerBar.label, workerBar.startedAt),
      )
    }
  }, 100)
  durationTimer.unref()

  /**
   * Creates or updates the progress row for a worker slot.
   *
   * @param slot - Zero-based worker slot index
   * @param label - Worker status label
   * @returns Worker bar state for the slot
   */
  const upsertWorkerBar = (slot: number, label: string): WorkerBarState => {
    if (!showWorkerRows) {
      return {
        bar: overallBar,
        label,
        startedAt: Date.now(),
      }
    }
    const existingBar = workerBars.get(slot)

    if (existingBar) {
      existingBar.label = label
      existingBar.bar.update(
        0,
        workerPayload(slot, label, existingBar.startedAt),
      )

      return existingBar
    }

    const startedAt = Date.now()
    const payload = workerPayload(slot, label, startedAt)
    const bar = bars.create(1, 0, payload, {
      format: `${pc.gray('Worker {slot}')} | {elapsed} | {label}`,
    })
    const state = { bar, label, startedAt }
    workerBars.set(slot, state)
    orderWorkerBars()

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
      if (!showWorkerRows) return
      const workerBar = workerBars.get(slot) ?? upsertWorkerBar(slot, label)

      workerBar.bar.update(1, {
        ...workerPayload(slot, label, workerBar.startedAt),
      })
      bars.remove(workerBar.bar)
      workerBars.delete(slot)
      orderWorkerBars()
    },
    tick: (label: string) => {
      overallBar.increment({ label })
    },
    stop: (finalLabel?: string) => {
      for (const [slot, workerBar] of workerBars) {
        workerBar.bar.update(1, {
          ...workerPayload(slot, 'Stopped', workerBar.startedAt),
        })
        bars.remove(workerBar.bar)
      }
      workerBars.clear()
      clearInterval(durationTimer)

      if (finalLabel) {
        overallBar.update(overallBar.getTotal(), { label: finalLabel })
      }

      bars.stop()
    },
  }
}

export default createProgress
