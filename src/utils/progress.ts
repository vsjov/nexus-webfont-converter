// Imports
// -----------------------------------------------------------------------------
// External
import cliProgress from 'cli-progress'
import pc from 'picocolors'


// Types
// -----------------------------------------------------------------------------
/**
 * Callbacks injected into pipeline steps to report progress and warnings
 * without coupling them to a specific output mechanism.
 */
export type ProgressOptions = {
  /** Called after each completed pipeline step with a human-readable label. */
  onProgress?: (label: string) => void,

  /** Called when a non-fatal issue is encountered (e.g. missing files). */
  onWarn?: (message: string) => void,
}

/**
 * Interface returned by `createProgress` for advancing the progress bar.
 */
export type ProgressReporter = {
  /** Advances the progress bar by one step and updates the displayed label. */
  tick: (label: string) => void,
}


// Function
// -----------------------------------------------------------------------------
/**
 * Creates a `cli-progress` bar pre-configured for the conversion pipeline.
 *
 * @param total - Total number of steps the pipeline will execute
 * @returns A reporter with `tick`, `warn`, and `stop` methods
 */
const createProgress = (total: number): ProgressReporter & { stop: (finalLabel?: string) => void } => {
  const bar = new cliProgress.SingleBar({
    format: `${pc.cyan('{bar}')} {percentage}% | {value}/{total} | {label}`,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
    clearOnComplete: false,
    stopOnComplete: false,
  }, cliProgress.Presets.shades_classic)

  bar.start(total, 0, { label: 'Starting...' })

  return {
    tick: (label: string) => {
      bar.increment({ label })
    },
    stop: (finalLabel?: string) => {
      if (finalLabel) {
        bar.update(bar.getTotal(), { label: finalLabel })
      }

      bar.stop()
    },
  }
}

export default createProgress
