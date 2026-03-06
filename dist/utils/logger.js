// Imports
// -----------------------------------------------------------------------------
// External
import pc from 'picocolors';
// Function
// -----------------------------------------------------------------------------
/**
 * Creates a plain console logger that writes to stdout/stderr.
 * Intended for standalone commands where no progress bar is active.
 *
 * @returns A `Logger` instance with `log` and `warn` methods
 */
const createLogger = () => ({
    log: (message) => {
        process.stdout.write(`${message}\n`);
    },
    warn: (message) => {
        process.stderr.write(`${pc.yellow('Warning:')} ${message}\n`);
    },
});
export default createLogger;
//# sourceMappingURL=logger.js.map