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
    const bars = new cliProgress.MultiBar({
        format: `${pc.cyan('{bar}')} {percentage}% | {value}/{total} | {label}`,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
        clearOnComplete: false,
        stopOnComplete: false,
    }, cliProgress.Presets.shades_classic);
    const overallBar = bars.create(total, 0, { label: 'Starting...' });
    const workerBars = new Map();
    /**
     * Creates or updates the progress row for a worker slot.
     *
     * @param slot - Zero-based worker slot index
     * @param label - Worker status label
     * @returns Worker bar state for the slot
     */
    const upsertWorkerBar = (slot, label) => {
        const existingBar = workerBars.get(slot);
        const payload = {
            label,
            slot: slot + 1,
        };
        if (existingBar) {
            existingBar.bar.update(0, payload);
            return existingBar;
        }
        const bar = bars.create(1, 0, payload, {
            format: `${pc.gray('Worker {slot}')} | {duration_formatted} | {label}`,
        });
        const state = { bar };
        workerBars.set(slot, state);
        return state;
    };
    return {
        update: (label) => {
            overallBar.update({ label });
        },
        startWorker: (slot, label) => {
            upsertWorkerBar(slot, label);
        },
        updateWorker: (slot, label) => {
            upsertWorkerBar(slot, label);
        },
        stopWorker: (slot, label) => {
            const workerBar = workerBars.get(slot) ?? upsertWorkerBar(slot, label);
            workerBar.bar.update(1, {
                label,
                slot: slot + 1,
            });
            bars.remove(workerBar.bar);
            workerBars.delete(slot);
        },
        tick: (label) => {
            overallBar.increment({ label });
        },
        stop: (finalLabel) => {
            for (const [slot, workerBar] of workerBars) {
                workerBar.bar.update(1, {
                    label: 'Stopped',
                    slot: slot + 1,
                });
                bars.remove(workerBar.bar);
            }
            workerBars.clear();
            if (finalLabel) {
                overallBar.update(overallBar.getTotal(), { label: finalLabel });
            }
            bars.stop();
        },
    };
};
export default createProgress;
//# sourceMappingURL=progress.js.map