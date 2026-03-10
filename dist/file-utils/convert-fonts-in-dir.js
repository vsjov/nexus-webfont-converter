// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { URL } from 'node:url';
// External
import pc from 'picocolors';
// Internal
import { SOURCE_EXTENSIONS } from '../config/constants.js';
import { toHyphenated } from '../utils/to-hyphenated.js';
// Helpers
// -----------------------------------------------------------------------------
const runTask = (task) => new Promise(resolve => {
    const worker = new Worker(new URL('./utils/font-conversion-worker.js', import.meta.url), { workerData: { inputPath: task.inputPath, outputPath: task.outputPath, format: task.format } });
    worker.on('message', (msg) => {
        if (msg.success) {
            task.onProgress?.(`Generated ${pc.green(`${task.normalizedBase}.${task.format}`)} from ${pc.blue(task.sourceName)}`);
        }
        else {
            task.onProgress?.(`Failed to convert ${pc.blue(task.sourceName)} to ${task.format.toUpperCase()}: ${msg.error}`);
        }
        resolve();
    });
    worker.on('error', (err) => {
        task.onProgress?.(`Worker error for ${pc.blue(task.sourceName)}: ${err.message}`);
        resolve();
    });
});
const runWithPool = async (tasks, concurrency) => {
    const queue = [...tasks];
    const runLoop = async () => {
        while (queue.length > 0) {
            const task = queue.shift();
            if (task)
                await runTask(task);
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, runLoop));
};
// Function
// -----------------------------------------------------------------------------
/**
 * Recursively scans `dirPath` for all `*.ttf` and `*.otf` files and converts
 * them to the requested web font formats using a pool of worker threads for
 * true CPU parallelism. Each output file is placed alongside the source file
 * by default, or inside `options.outputDir` when provided (preserving the
 * relative sub-directory structure).
 *
 * @param dirPath - Directory to scan for source font files
 * @param options - Optional configuration
 * @param options.outputDir - Override destination directory (default: same as source file)
 * @param options.formats - Which formats to produce (default: `['woff', 'woff2']`)
 *
 * @example
 * ```ts
 * convertFontsInDir('./assets/roboto', { formats: ['woff2'] })
 * ```
 */
export const convertFontsInDir = async (dirPath, options = {}) => {
    const { outputDir, formats = ['woff', 'woff2'], onProgress, onWarn, } = options;
    const allEntries = fs.readdirSync(dirPath, { recursive: true, encoding: 'utf-8' });
    const fontFiles = allEntries.filter(entry => SOURCE_EXTENSIONS.includes(path.extname(entry).toLowerCase()));
    if (fontFiles.length === 0) {
        onWarn?.(`No TTF or OTF files found in ${pc.blue(dirPath)}`);
        return;
    }
    const tasks = fontFiles.flatMap(relPath => {
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
            onProgress,
        }));
    });
    await runWithPool(tasks, os.cpus().length);
};
export default convertFontsInDir;
//# sourceMappingURL=convert-fonts-in-dir.js.map