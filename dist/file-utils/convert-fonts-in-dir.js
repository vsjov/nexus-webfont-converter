// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs';
import path from 'node:path';
// External
import log from 'fancy-log';
import pc from 'picocolors';
// Internal
import { SOURCE_EXTENSIONS } from '../config/constants.js';
import { toHyphenated } from '../utils/to-hyphenated.js';
import { convertFontToWoff } from './utils/convert-font-to-woff.js';
import { convertFontToWoff2 } from './utils/convert-font-to-woff2.js';
// Function
// -----------------------------------------------------------------------------
/**
 * Recursively scans `dirPath` for all `*.ttf` and `*.otf` files and converts
 * them to the requested web font formats. Each output file is placed alongside
 * the source file by default, or inside `options.outputDir` when provided
 * (preserving the relative sub-directory structure).
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
export const convertFontsInDir = (dirPath, options = {}) => {
    const { outputDir, formats = ['woff', 'woff2'], } = options;
    const allEntries = fs.readdirSync(dirPath, { recursive: true, encoding: 'utf-8' });
    const fontFiles = allEntries.filter(entry => SOURCE_EXTENSIONS.includes(path.extname(entry).toLowerCase()));
    if (fontFiles.length === 0) {
        log(pc.yellow(`No TTF or OTF files found in ${pc.blue(dirPath)}`));
        return;
    }
    for (const relPath of fontFiles) {
        const inputPath = path.join(dirPath, relPath);
        const resolvedOutputDir = outputDir
            ? path.join(outputDir, path.dirname(relPath))
            : path.dirname(inputPath);
        const fileBase = path.basename(relPath, path.extname(relPath));
        const normalizedBase = toHyphenated(fileBase);
        if (formats.includes('woff')) {
            const woffPath = path.join(resolvedOutputDir, `${normalizedBase}.woff`);
            try {
                convertFontToWoff(inputPath, woffPath);
                log(`Generated ${pc.green(`${normalizedBase}.woff`)} from ${pc.blue(path.basename(relPath))}`);
            }
            catch (err) {
                log(pc.red(`Failed to convert ${pc.blue(path.basename(relPath))} to WOFF: ${err.message}`));
            }
        }
        if (formats.includes('woff2')) {
            const woff2Path = path.join(resolvedOutputDir, `${normalizedBase}.woff2`);
            try {
                convertFontToWoff2(inputPath, woff2Path);
                log(`Generated ${pc.green(`${normalizedBase}.woff2`)} from ${pc.blue(path.basename(relPath))}`);
            }
            catch (err) {
                log(pc.red(`Failed to convert ${pc.blue(path.basename(relPath))} to WOFF2: ${err.message}`));
            }
        }
    }
};
export default convertFontsInDir;
//# sourceMappingURL=convert-fonts-in-dir.js.map