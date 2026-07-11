// Imports
// -----------------------------------------------------------------------------
// NodeJS
import { fork } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { URL } from 'node:url';
// External
import pc from 'picocolors';
// Internal
import { SOURCE_EXTENSIONS } from '../config/constants.js';
import { getRelativeDirentPath, } from '../utils/get-relative-dirent-path.js';
import { toHyphenated } from '../utils/to-hyphenated.js';
// Helpers
// -----------------------------------------------------------------------------
/**
 * Checks whether a recursive directory entry is a supported source font file.
 *
 * @param entry - Recursive directory entry to inspect
 * @returns `true` when the entry is a source font file
 */
const isSourceFontEntry = (entry) => {
    if (typeof entry === 'string') {
        return SOURCE_EXTENSIONS.includes(path.extname(entry).toLowerCase());
    }
    return (entry.isFile() &&
        SOURCE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase()));
};
/**
 * Converts a recursive directory entry into a relative path.
 *
 * @param rootDir - Directory passed to `readdirSync`
 * @param entry - Recursive directory entry to convert
 * @returns Relative source font path
 */
const getRelativeEntryPath = (rootDir, entry) => typeof entry === 'string' ? entry : getRelativeDirentPath(rootDir, entry);
/**
 * Finds source font files under a directory.
 *
 * @param dirPath - Directory to scan recursively
 * @returns Relative source font paths
 */
const findSourceFontFiles = (dirPath) => fs.readdirSync(dirPath, {
    recursive: true,
    withFileTypes: true,
})
    .filter(isSourceFontEntry)
    .map(entry => getRelativeEntryPath(dirPath, entry));
/**
 * Converts one source font to one or more output formats in a forked child
 * process. Child processes are used instead of worker threads because the
 * native ttf2woff2 addon can be loaded by only one thread per process; a
 * process per conversion keeps every parallel WOFF2 conversion on the fast
 * native path.
 *
 * @param task - Conversion task metadata and callbacks
 * @param slot - Zero-based worker pool slot index
 * @returns Worker conversion results
 */
const runTask = (task, slot) => new Promise(resolve => {
    let isSettled = false;
    const results = [];
    const worker = fork(new URL('./utils/font-conversion-worker.js', import.meta.url), [
        JSON.stringify({
            inputPath: task.inputPath,
            outputs: task.outputs,
        }),
    ], {
        execArgv: process.execArgv.filter(arg => arg !== '--input-type=module'),
    });
    task.onWorkerStart?.(slot, `Starting ${pc.blue(task.sourceName)}`);
    const reportResult = (result) => {
        if (result.success) {
            task.onProgress?.(`Generated ${pc.green(`${task.normalizedBase}.${result.format}`)} from ${pc.blue(task.sourceName)}`);
        }
        else {
            task.onWarn?.(`Failed to convert ${pc.blue(task.sourceName)} to ${result.format.toUpperCase()}: ${result.error}`);
        }
    };
    const settle = (finalResults, shouldReport = true) => {
        if (isSettled)
            return;
        isSettled = true;
        if (worker.connected)
            worker.disconnect();
        task.onWorkerDone?.(slot, `Finished ${pc.blue(task.sourceName)}`);
        if (shouldReport) {
            for (const result of finalResults)
                reportResult(result);
        }
        resolve(finalResults);
    };
    const recordResult = (result) => {
        results.push(result);
        reportResult(result);
        if (results.length === task.outputs.length) {
            settle(results, false);
        }
    };
    const settleWithRemainingFailures = (buildError) => {
        const failures = task.outputs
            .filter(output => !results.some(r => r.format === output.format))
            .map(output => ({
            format: output.format,
            success: false,
            error: buildError(),
        }));
        for (const failure of failures)
            reportResult(failure);
        settle([...results, ...failures], false);
    };
    worker.on('message', (msg) => {
        if ('status' in msg) {
            const label = `Converting ${pc.blue(task.sourceName)} to ${msg.status.format.toUpperCase()}`;
            task.onStatus?.(label);
            task.onWorkerStatus?.(slot, label);
            return;
        }
        if ('result' in msg) {
            recordResult(msg.result);
            return;
        }
        for (const result of msg.results)
            reportResult(result);
        settle(msg.results, false);
    });
    worker.on('error', (err) => {
        settleWithRemainingFailures(() => `Worker error: ${err.message}`);
    });
    worker.on('exit', (code) => {
        if (isSettled)
            return;
        settleWithRemainingFailures(() => `Worker exited before sending a conversion result with code ${code ?? 'unknown'}`);
    });
});
/**
 * Runs conversion tasks with bounded concurrency.
 *
 * @param tasks - Conversion tasks to process
 * @param concurrency - Maximum number of concurrent worker tasks
 * @returns Conversion results in completion order
 */
const runWithPool = async (tasks, concurrency) => {
    const queue = [...tasks];
    const results = [];
    const runLoop = async (_unused, slot) => {
        while (queue.length > 0) {
            const task = queue.shift();
            if (task)
                results.push(...(await runTask(task, slot)));
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, runLoop));
    return results;
};
/**
 * Chooses a deterministic source when several tasks would write the same
 * output file.
 *
 * @param candidates - Output candidates that target the same output path
 * @returns Preferred output candidate to keep
 */
const selectPreferredCandidate = (candidates) => {
    return [...candidates].sort((a, b) => {
        const extA = path.extname(a.inputPath).toLowerCase();
        const extB = path.extname(b.inputPath).toLowerCase();
        const rankA = extA === '.ttf' ? 0 : 1;
        const rankB = extB === '.ttf' ? 0 : 1;
        if (rankA !== rankB)
            return rankA - rankB;
        return a.sourceName.localeCompare(b.sourceName);
    })[0];
};
/**
 * Removes output candidates that would write to the same output path.
 *
 * @param candidates - Candidate conversion outputs
 * @param onWarn - Optional warning callback for skipped duplicate outputs
 * @returns Deduplicated conversion outputs
 */
const dedupeCandidatesByOutputPath = (candidates, onWarn) => {
    const groups = new Map();
    for (const candidate of candidates) {
        groups.set(candidate.outputPath, [
            ...(groups.get(candidate.outputPath) ?? []),
            candidate,
        ]);
    }
    return Array.from(groups.values()).map(group => {
        if (group.length === 1)
            return group[0];
        const preferredCandidate = selectPreferredCandidate(group);
        const skippedCandidates = group.filter(candidate => candidate !== preferredCandidate);
        for (const skippedCandidate of skippedCandidates) {
            onWarn?.(`Skipping ${pc.blue(skippedCandidate.sourceName)} because it would overwrite ${pc.green(path.basename(skippedCandidate.outputPath))} generated from ${pc.blue(preferredCandidate.sourceName)}`);
        }
        return preferredCandidate;
    });
};
/**
 * Groups output candidates into one worker task per source font.
 *
 * @param candidates - Deduplicated output candidates
 * @param onStatus - Optional status callback
 * @param onWorkerStart - Optional worker slot start callback
 * @param onWorkerStatus - Optional worker slot status callback
 * @param onWorkerDone - Optional worker slot completion callback
 * @param onProgress - Optional progress callback
 * @param onWarn - Optional warning callback
 * @returns Conversion tasks grouped by source file
 */
const groupCandidatesBySource = (candidates, onStatus, onWorkerStart, onWorkerStatus, onWorkerDone, onProgress, onWarn) => {
    const tasksByInputPath = new Map();
    for (const candidate of candidates) {
        const task = tasksByInputPath.get(candidate.inputPath);
        if (task) {
            task.outputs.push({
                outputPath: candidate.outputPath,
                format: candidate.format,
            });
            continue;
        }
        tasksByInputPath.set(candidate.inputPath, {
            inputPath: candidate.inputPath,
            sourceName: candidate.sourceName,
            normalizedBase: candidate.normalizedBase,
            outputs: [
                {
                    outputPath: candidate.outputPath,
                    format: candidate.format,
                },
            ],
            onStatus,
            onWorkerStart,
            onWorkerStatus,
            onWorkerDone,
            onProgress,
            onWarn,
        });
    }
    return Array.from(tasksByInputPath.values());
};
// Function
// -----------------------------------------------------------------------------
/**
 * Recursively scans `dirPath` for all `*.ttf` and `*.otf` files and converts
 * them to the requested web font formats using a pool of forked child
 * processes for true CPU parallelism. Child processes (rather than worker
 * threads) let every parallel conversion load the native ttf2woff2 addon.
 * Each output file is placed alongside the source file by default, or inside
 * `options.outputDir` when provided (preserving the relative sub-directory
 * structure).
 *
 * @param dirPath - Directory to scan for source font files
 * @param options - Optional configuration
 * @param options.outputDir - Override destination directory (default: same as source file)
 * @param options.formats - Which formats to produce (default: `['woff', 'woff2']`)
 * @param options.sourceFontFiles - Pre-scanned source font paths relative to `dirPath`
 *
 * @example
 * ```ts
 * convertFontsInDir('./assets/roboto', { formats: ['woff2'] })
 * ```
 */
export const convertFontsInDir = async (dirPath, options = {}) => {
    const { outputDir, formats = ['woff', 'woff2'], sourceFontFiles, onStatus, onWorkerStart, onWorkerStatus, onWorkerDone, onProgress, onWarn, } = options;
    const fontFiles = sourceFontFiles ?? findSourceFontFiles(dirPath);
    if (fontFiles.length === 0) {
        onWarn?.(`No TTF or OTF files found in ${pc.blue(dirPath)}`);
        return;
    }
    const candidates = fontFiles.flatMap(relPath => {
        const inputPath = path.join(dirPath, relPath);
        const resolvedOutputDir = outputDir
            ? path.join(outputDir, path.dirname(relPath))
            : path.dirname(inputPath);
        const normalizedBase = toHyphenated(path.basename(relPath, path.extname(relPath)));
        const sourceName = path.basename(relPath);
        return formats.map(format => ({
            inputPath,
            outputPath: path.join(resolvedOutputDir, `${normalizedBase}.${format}`),
            format,
            sourceName,
            normalizedBase,
        }));
    });
    const dedupedCandidates = dedupeCandidatesByOutputPath(candidates, onWarn);
    const tasks = groupCandidatesBySource(dedupedCandidates, onStatus, onWorkerStart, onWorkerStatus, onWorkerDone, onProgress, onWarn);
    const results = await runWithPool(tasks, os.availableParallelism());
    const failureCount = results.filter(result => !result.success).length;
    if (results.some(result => result.usedWasmFallback)) {
        onWarn?.('WOFF2 conversion used the slower WASM fallback because the native ttf2woff2 addon could not be loaded.');
    }
    if (failureCount > 0) {
        throw new Error(`${failureCount} font conversion${failureCount === 1 ? '' : 's'} failed.`);
    }
};
export default convertFontsInDir;
//# sourceMappingURL=convert-fonts-in-dir.js.map