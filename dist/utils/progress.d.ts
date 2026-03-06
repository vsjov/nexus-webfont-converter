/**
 * Callbacks injected into pipeline steps to report progress and warnings
 * without coupling them to a specific output mechanism.
 */
export type ProgressOptions = {
    /** Called after each completed pipeline step with a human-readable label. */
    onProgress?: (label: string) => void;
    /** Called when a non-fatal issue is encountered (e.g. missing files). */
    onWarn?: (message: string) => void;
};
/**
 * Interface returned by `createProgress` for advancing the progress bar.
 */
export type ProgressReporter = {
    /** Advances the progress bar by one step and updates the displayed label. */
    tick: (label: string) => void;
};
/**
 * Creates a `cli-progress` bar pre-configured for the conversion pipeline.
 *
 * @param total - Total number of steps the pipeline will execute
 * @returns A reporter with `tick`, `warn`, and `stop` methods
 */
declare const createProgress: (total: number) => ProgressReporter & {
    stop: (finalLabel?: string) => void;
};
export default createProgress;
//# sourceMappingURL=progress.d.ts.map