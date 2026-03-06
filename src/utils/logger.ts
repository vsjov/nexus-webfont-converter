// Imports
// -----------------------------------------------------------------------------
// External
import pc from 'picocolors'


// Types
// -----------------------------------------------------------------------------
/**
 * Simple logger interface for maintenance commands that do not use a progress
 * bar (e.g. `removeUnusedFonts`, `regenerateFontPreviewHtml`).
 */
export type Logger = {
  /** Writes a plain message to stdout. */
  log: (message: string) => void,

  /** Writes a yellow-prefixed warning message to stderr. */
  warn: (message: string) => void,
}


// Function
// -----------------------------------------------------------------------------
/**
 * Creates a plain console logger that writes to stdout/stderr.
 * Intended for standalone commands where no progress bar is active.
 *
 * @returns A `Logger` instance with `log` and `warn` methods
 */
const createLogger = (): Logger => ({
  log: (message: string) => {
    process.stdout.write(`${message}\n`)
  },
  warn: (message: string) => {
    process.stderr.write(`${pc.yellow('Warning:')} ${message}\n`)
  },
})

export default createLogger
