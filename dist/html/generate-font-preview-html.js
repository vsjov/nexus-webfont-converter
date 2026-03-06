// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs';
import path from 'node:path';
// External
import log from 'fancy-log';
import pc from 'picocolors';
// Internal
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
    const entries = fs.readdirSync(inputDir);
    const fontDirs = entries.filter(entry => {
        try {
            return fs.statSync(path.join(inputDir, entry)).isDirectory();
        }
        catch {
            return false;
        }
    });
    if (fontDirs.length === 0) {
        log(pc.yellow(`No font subdirectories found in ${pc.blue(inputDir)}`));
        return;
    }
    for (const dirName of fontDirs) {
        generateHtmlForDir(path.join(inputDir, dirName), path.join(outputDir, dirName), dirName);
    }
};
export default generateFontPreviewHtml;
//# sourceMappingURL=generate-font-preview-html.js.map