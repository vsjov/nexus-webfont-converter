/**
 * Callbacks injected into pipeline steps to report progress and warnings
 * without coupling them to a specific output mechanism.
 */
export type ProgressOptions = {
    /** Called when the active pipeline status changes without completing a step. */
    onStatus?: (label: string) => void;
    /** Called when a bounded worker slot starts processing an item. */
    onWorkerStart?: (slot: number, label: string) => void;
    /** Called when a bounded worker slot changes status. */
    onWorkerStatus?: (slot: number, label: string) => void;
    /** Called when a bounded worker slot finishes processing an item. */
    onWorkerDone?: (slot: number, label: string) => void;
    /** Called after each completed pipeline step with a human-readable label. */
    onProgress?: (label: string) => void;
    /** Called when a non-fatal issue is encountered (e.g. missing files). */
    onWarn?: (message: string) => void;
};
/**
 * Interface returned by `createProgress` for advancing the progress bar.
 */
export type ProgressReporter = {
    /** Updates the displayed label without advancing the progress bar. */
    update: (label: string) => void;
    /** Shows a worker slot as active. */
    startWorker: (slot: number, label: string) => void;
    /** Updates an active worker slot. */
    updateWorker: (slot: number, label: string) => void;
    /** Marks a worker slot as complete and removes it from the display. */
    stopWorker: (slot: number, label: string) => void;
    /** Advances the progress bar by one step and updates the displayed label. */
    tick: (label: string) => void;
};
/**
 * Returns whether the terminal can display the overall bar and every worker row.
 *
 * @param workerCount - Maximum number of concurrently active conversion workers
 * @returns `true` when the full worker table fits in the active terminal
 */
export declare const canShowWorkerRows: (workerCount: number) => boolean;
/**
 * Determines whether a terminal can reserve rows for the complete worker table.
 *
 * @param workerCount - Maximum number of concurrently active conversion workers
 * @param isTTY - Whether the output stream is an interactive terminal
 * @param rows - Terminal height when available
 * @returns `true` when the overall row and every worker row fit
 */
export declare const canShowWorkerRowsForTerminal: (workerCount: number, isTTY: boolean | undefined, rows: number | undefined) => boolean;
/**
 * Formats a worker slot using the width of the configured worker pool.
 *
 * @param slot - One-based worker slot number
 * @param workerCount - Maximum number of concurrently active workers
 * @returns Right-aligned worker slot text
 */
export declare const formatWorkerSlot: (slot: number, workerCount: number) => string;
/**
 * Formats elapsed seconds into a fixed-width, compact duration cell.
 *
 * @param durationSeconds - Elapsed duration measured in seconds
 * @returns A six-character duration using seconds, minutes, hours, or days
 */
export declare const formatElapsedDuration: (durationSeconds: number) => string;
/**
 * Creates a `cli-progress` bar pre-configured for the conversion pipeline.
 *
 * @param total - Total number of steps the pipeline will execute
 * @param workerCount - Maximum number of concurrently active conversion workers
 * @returns A reporter with `tick`, `warn`, and `stop` methods
 */
declare const createProgress: (total: number, workerCount?: number) => ProgressReporter & {
    stop: (finalLabel?: string) => void;
};
export default createProgress;
//# sourceMappingURL=progress.d.ts.map