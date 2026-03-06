/**
 * Simple logger interface for maintenance commands that do not use a progress
 * bar (e.g. `removeUnusedFonts`, `regenerateFontPreviewHtml`).
 */
export type Logger = {
    /** Writes a plain message to stdout. */
    log: (message: string) => void;
    /** Writes a yellow-prefixed warning message to stderr. */
    warn: (message: string) => void;
};
/**
 * Creates a plain console logger that writes to stdout/stderr.
 * Intended for standalone commands where no progress bar is active.
 *
 * @returns A `Logger` instance with `log` and `warn` methods
 */
declare const createLogger: () => Logger;
export default createLogger;
//# sourceMappingURL=logger.d.ts.map