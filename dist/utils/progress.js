// Imports
// -----------------------------------------------------------------------------
// External
import cliProgress from 'cli-progress';
import pc from 'picocolors';
// Function
// -----------------------------------------------------------------------------
/**
 * Creates a `cli-progress` bar pre-configured for the conversion pipeline.
 *
 * @param total - Total number of steps the pipeline will execute
 * @returns A reporter with `tick`, `warn`, and `stop` methods
 */
const createProgress = (total) => {
    const bar = new cliProgress.SingleBar({
        format: `${pc.cyan('{bar}')} {percentage}% | {value}/{total} | {label}`,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
        clearOnComplete: false,
        stopOnComplete: false,
    }, cliProgress.Presets.shades_classic);
    bar.start(total, 0, { label: 'Starting...' });
    return {
        tick: (label) => {
            bar.increment({ label });
        },
        stop: (finalLabel) => {
            if (finalLabel) {
                bar.update(bar.getTotal(), { label: finalLabel });
            }
            bar.stop();
        },
    };
};
export default createProgress;
//# sourceMappingURL=progress.js.map