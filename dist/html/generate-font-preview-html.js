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
import { getSubdirectories } from '../utils/get-subdirectories.js';
import { generateHtmlForDir } from './utils/generate-html-for-dir.js';
// Functions
// -----------------------------------------------------------------------------
/**
 * Iterates all direct subdirectories of `inputDir` and generates an HTML
 * preview page in the corresponding `outputDir/[font-name]/` subdirectory.
 *
 * @param inputDir - Root input directory (e.g. `build/in/`)
 * @param outputDir - Root output directory (e.g. `build/out/`)
 */
export const generateFontPreviewHtml = (inputDir, outputDir) => {
    const fontDirs = getSubdirectories(inputDir);
    if (fontDirs.length === 0) {
        const directFonts = fs.readdirSync(inputDir).filter(e => SOURCE_EXTENSIONS.includes(path.extname(e).toLowerCase()));
        if (directFonts.length > 0) {
            generateHtmlForDir(inputDir, outputDir, path.basename(inputDir));
            return;
        }
        log(pc.yellow(`No font subdirectories found in ${pc.blue(inputDir)}`));
        return;
    }
    for (const dirName of fontDirs) {
        generateHtmlForDir(path.join(inputDir, dirName), path.join(outputDir, dirName), dirName);
    }
};
export default generateFontPreviewHtml;
//# sourceMappingURL=generate-font-preview-html.js.map