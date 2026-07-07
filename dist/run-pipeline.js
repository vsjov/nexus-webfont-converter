// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs';
import path from 'node:path';
import { join } from 'node:path';
// External
import gulp from 'gulp';
import { deleteAsync } from 'del';
import pc from 'picocolors';
// Internal
import { SOURCE_EXTENSIONS, LICENSE_EXTENSIONS, OUTPUT_FORMATS, } from './config/constants.js';
import { convertFontsInDir } from './file-utils/convert-fonts-in-dir.js';
import { copyLicenseFiles } from './file-utils/copy-license-files.js';
import { generateFontFaceScss } from './scss/generate-font-face-scss.js';
import { compileCssFiles } from './scss/compile-css.js';
import { generateFontPreviewHtml } from './html/generate-font-preview-html.js';
import createProgress from './utils/progress.js';
// Helpers
// -----------------------------------------------------------------------------
/**
 * Converts a recursive dirent into a path relative to the scanned root.
 *
 * @param rootDir - Directory passed to `readdirSync`
 * @param entry - Dirent returned from recursive `readdirSync`
 * @returns Relative path for the entry
 */
const getRelativeDirentPath = (rootDir, entry) => {
    const parentPath = entry.parentPath ?? entry.path ?? rootDir;
    return path.relative(rootDir, path.join(parentPath, entry.name));
};
/**
 * Checks whether a relative path is directly inside the scanned root.
 *
 * @param relativePath - Relative path to inspect
 * @returns `true` when the path has no parent directory
 */
const isDirectChild = (relativePath) => path.dirname(relativePath) === '.';
/**
 * Returns the first path segment from a relative path.
 *
 * @param relativePath - Relative path to inspect
 * @returns First path segment
 */
const getFirstPathSegment = (relativePath) => relativePath.split(path.sep)[0];
/**
 * Checks whether a relative path is a direct child of an immediate
 * subdirectory.
 *
 * @param relativePath - Relative path to inspect
 * @returns `true` when the path is one level below an immediate subdirectory
 */
const isDirectChildOfImmediateDirectory = (relativePath) => {
    const parentPath = path.dirname(relativePath);
    return parentPath !== '.' && !parentPath.includes(path.sep);
};
/**
 * Scans the input tree once for source fonts, license files, and font
 * generation directories.
 *
 * @param inputDir - Root input directory
 * @returns Input tree scan details
 */
const scanInputTree = (inputDir) => {
    const entries = fs.readdirSync(inputDir, {
        recursive: true,
        withFileTypes: true,
    });
    const fontFiles = [];
    const licenseFiles = [];
    const immediateDirectories = new Set();
    const directoriesWithDirectFonts = new Set();
    let hasDirectRootFonts = false;
    for (const entry of entries) {
        const relativePath = getRelativeDirentPath(inputDir, entry);
        if (entry.isDirectory() && isDirectChild(relativePath)) {
            immediateDirectories.add(entry.name);
            continue;
        }
        if (!entry.isFile())
            continue;
        const ext = path.extname(entry.name).toLowerCase();
        if (SOURCE_EXTENSIONS.includes(ext)) {
            fontFiles.push(relativePath);
            if (isDirectChild(relativePath)) {
                hasDirectRootFonts = true;
            }
            else if (isDirectChildOfImmediateDirectory(relativePath)) {
                directoriesWithDirectFonts.add(getFirstPathSegment(relativePath));
            }
        }
        if (entry.name !== '.gitkeep' &&
            LICENSE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
            licenseFiles.push(relativePath);
        }
    }
    const fontGenerationDirCount = immediateDirectories.size === 0
        ? hasDirectRootFonts
            ? 1
            : 0
        : Array.from(immediateDirectories).filter(dirName => directoriesWithDirectFonts.has(dirName)).length;
    return {
        fontFiles,
        licenseFiles,
        fontGenerationDirCount,
    };
};
/**
 * Computes the progress bar total from a pre-scanned input tree.
 *
 * @param scan - Pre-scanned input tree details
 * @param formats - Output formats to generate
 * @returns Total number of progress steps
 */
const computeTotalSteps = (scan, formats) => {
    return (1 + // clean
        scan.fontFiles.length * formats.length + // font conversions
        scan.licenseFiles.length + // license copies
        scan.fontGenerationDirCount + // SCSS per family
        1 + // CSS compilation
        scan.fontGenerationDirCount // HTML per family
    );
};
// Function
// -----------------------------------------------------------------------------
/**
 * Runs the full webfont conversion pipeline: cleans the output directory,
 * converts fonts to WOFF/WOFF2, copies license files, generates SCSS/CSS,
 * and creates an HTML preview page.
 *
 * @param inputDir - Absolute path to the directory containing source TTF/OTF fonts
 * @param outputDir - Absolute path to the output directory for converted files
 */
const runPipeline = (inputDir, outputDir) => {
    const formats = OUTPUT_FORMATS;
    const inputTreeScan = scanInputTree(inputDir);
    const total = computeTotalSteps(inputTreeScan, formats);
    const progress = createProgress(total);
    const warnings = [];
    const warn = (msg) => warnings.push(msg);
    const cleanOutput = async () => {
        await deleteAsync([join(outputDir, '**', '*'), `!${join(outputDir, '.gitkeep')}`], { force: true, dot: true });
        progress.tick('Cleaned output directory');
    };
    const convertFonts = () => convertFontsInDir(inputDir, {
        outputDir,
        formats: [...OUTPUT_FORMATS],
        sourceFontFiles: inputTreeScan.fontFiles,
        onProgress: label => progress.tick(label),
        onWarn: warn,
    });
    const copyLicenses = (cb) => {
        copyLicenseFiles(inputDir, outputDir, {
            sourceLicenseFiles: inputTreeScan.licenseFiles,
            onProgress: label => progress.tick(label),
            onWarn: warn,
        });
        cb();
    };
    const generateScss = (cb) => {
        generateFontFaceScss(inputDir, outputDir, {
            onProgress: label => progress.tick(label),
            onWarn: warn,
        });
        cb();
    };
    const compileCss = () => compileCssFiles(outputDir).on('end', () => {
        progress.tick('Compiled CSS');
    });
    const generateHtml = (cb) => {
        generateFontPreviewHtml(inputDir, outputDir, {
            onProgress: label => progress.tick(label),
            onWarn: warn,
        });
        cb();
    };
    const convertAndCopyLicenses = gulp.parallel(convertFonts, copyLicenses);
    const pipeline = gulp.series(cleanOutput, convertAndCopyLicenses, generateScss, compileCss, generateHtml);
    return new Promise((resolve, reject) => {
        pipeline(err => {
            progress.stop('Done');
            if (warnings.length > 0) {
                process.stderr.write(warnings.map(w => `${pc.yellow('Warning:')} ${w}`).join('\n') + '\n');
            }
            if (err) {
                reject(err instanceof Error ? err : new Error(String(err)));
            }
            else {
                process.stdout.write(`\nSaved to: ${pc.magenta(outputDir)}\n`);
                resolve();
            }
        });
    });
};
export default runPipeline;
//# sourceMappingURL=run-pipeline.js.map