// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs';
import path from 'node:path';
// External
import pc from 'picocolors';
// Internal
import { SOURCE_EXTENSIONS } from '../config/constants.js';
import { getSubdirectories } from './get-subdirectories.js';
// Function
// -----------------------------------------------------------------------------
/**
 * Resolves font directories from `inputDir` and calls `fn` for each one.  If no
 * subdirectories are found but font files exist directly in `inputDir`, `fn` is
 * called once with `inputDir` as both the source and the root of output.
 *
 * @param inputDir - Root input directory containing font subdirectories or
 * files
 * @param outputDir - Root output directory
 * @param onWarn - Optional callback invoked when no fonts or directories are
 * found
 * @param fn - Called for each resolved font directory
 */
const forEachFontDir = (inputDir, outputDir, onWarn, fn) => {
    const fontDirs = getSubdirectories(inputDir);
    if (fontDirs.length === 0) {
        const directFonts = fs.readdirSync(inputDir).filter(e => SOURCE_EXTENSIONS.includes(path.extname(e).toLowerCase()));
        if (directFonts.length > 0) {
            fn(inputDir, outputDir, path.basename(inputDir));
            return;
        }
        onWarn?.(`No font subdirectories found in ${pc.blue(inputDir)}`);
        return;
    }
    for (const dirName of fontDirs) {
        fn(path.join(inputDir, dirName), path.join(outputDir, dirName), dirName);
    }
};
export default forEachFontDir;
//# sourceMappingURL=for-each-font-dir.js.map