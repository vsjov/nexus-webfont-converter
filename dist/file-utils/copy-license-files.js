// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs';
import path from 'node:path';
// External
import pc from 'picocolors';
// Config
import { LICENSE_EXTENSIONS } from '../config/constants.js';
// Internal
import { getRelativeDirentPath, } from '../utils/get-relative-dirent-path.js';
import { isFileEntry } from '../utils/is-file-entry.js';
// Helpers
// -----------------------------------------------------------------------------
/**
 * Converts a recursive directory entry into a relative path.
 *
 * @param rootDir - Directory passed to `readdirSync`
 * @param entry - Recursive directory entry to convert
 * @returns Relative entry path
 */
const getRelativeEntryPath = (rootDir, entry) => typeof entry === 'string' ? entry : getRelativeDirentPath(rootDir, entry);
/**
 * Checks whether a recursive directory entry is a license file.
 *
 * @param entry - Recursive directory entry to inspect
 * @returns `true` when the entry is a license file
 */
const isLicenseFileEntry = (inputDir, entry) => {
    const entryName = typeof entry === 'string' ? entry : entry.name;
    if (path.basename(entryName) === '.gitkeep')
        return false;
    const ext = path.extname(entryName).toLowerCase();
    if (!LICENSE_EXTENSIONS.includes(ext))
        return false;
    return isFileEntry(inputDir, entry);
};
/**
 * Finds license files under a directory.
 *
 * @param inputDir - Directory to scan recursively
 * @returns Relative license file paths
 */
const findLicenseFiles = (inputDir) => fs.readdirSync(inputDir, {
    recursive: true,
    withFileTypes: true,
})
    .filter(entry => isLicenseFileEntry(inputDir, entry))
    .map(entry => getRelativeEntryPath(inputDir, entry));
// Function
// -----------------------------------------------------------------------------
/**
 * Copies license files (`.txt`, `.md`, `.pdf`, or files with no extension) from
 * `inputDir` and its nested sub-directories to the corresponding paths under
 * `outputDir`, preserving the relative directory structure.
 *
 * @param inputDir - Root input directory (e.g. `build/in/`)
 * @param outputDir - Root output directory (e.g. `build/out/`)
 * @param options - Progress callbacks and optional pre-scanned license files
 */
export const copyLicenseFiles = (inputDir, outputDir, options = {}) => {
    const { sourceLicenseFiles, onProgress } = options;
    const licenseFiles = sourceLicenseFiles ?? findLicenseFiles(inputDir);
    if (licenseFiles.length === 0) {
        return;
    }
    for (const relPath of licenseFiles) {
        const destPath = path.join(outputDir, relPath);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(path.join(inputDir, relPath), destPath);
        onProgress?.(`Copied license ${pc.green(path.basename(relPath))} -> ${pc.blue(path.dirname(destPath))}`);
    }
};
export default copyLicenseFiles;
//# sourceMappingURL=copy-license-files.js.map