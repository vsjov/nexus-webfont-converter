// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs';
import path from 'node:path';
// External
import pc from 'picocolors';
// Internal
import { PREVIEW_GLYPHS } from '../config/constants.js';
import { inferFontFamilyName } from '../utils/infer-font-family-name.js';
import { buildFontTargets } from '../utils/build-font-targets.js';
import { findLicenseFile } from '../utils/find-license-file.js';
import { parseScssEntries } from './utils/parse-scss-entries.js';
import { templateHtmlSamples } from './utils/template-html-samples.js';
import createLogger from '../utils/logger.js';
// Function
// -----------------------------------------------------------------------------
/**
 * Re-generates HTML preview pages for all font families in `outputDir` by
 * reading the variant list from the existing `[font-name].scss` file rather
 * than re-scanning the source font directory.
 *
 * Use this after manually editing a `.scss` file to keep the HTML preview in
 * sync with the updated `@include` list.
 *
 * @param outputDir - Root output directory containing per-family subdirectories
 *                    (e.g. `build/out/`)
 *
 * @example
 * ```ts
 * regenerateFontPreviewHtml('./build/out')
 * // -> rewrites build/out/dm-sans/dm-sans.html based on dm-sans.scss
 * ```
 */
export const regenerateFontPreviewHtml = (outputDir) => {
    const logger = createLogger();
    const targets = buildFontTargets(outputDir);
    if (targets.length === 0) {
        logger.warn(`No font subdirectories found in ${pc.blue(outputDir)}`);
        return;
    }
    for (const { outputFontDir, dirName } of targets) {
        const scssPath = path.join(outputFontDir, `${dirName}.scss`);
        if (!fs.existsSync(scssPath)) {
            logger.warn(`No SCSS file found in ${pc.blue(outputFontDir)} - skipping HTML regeneration`);
            continue;
        }
        const scssContent = fs.readFileSync(scssPath, 'utf-8');
        const fontEntries = parseScssEntries(scssContent);
        if (fontEntries.length === 0) {
            logger.warn(`No @include fontFace entries found in ${pc.blue(scssPath)} - skipping HTML regeneration`);
            continue;
        }
        const familyName = inferFontFamilyName(dirName);
        const html = templateHtmlSamples({
            familyName,
            dirName,
            entries: fontEntries,
            glyphs: PREVIEW_GLYPHS,
            licenseFile: findLicenseFile(outputFontDir),
        });
        const outputPath = path.join(outputFontDir, `${dirName}.html`);
        fs.writeFileSync(outputPath, html, 'utf-8');
        logger.log(`Regenerated ${pc.green(`${dirName}.html`)} for ${pc.blue(familyName)} (${fontEntries.length} variants)`);
    }
};
export default regenerateFontPreviewHtml;
//# sourceMappingURL=regenerate-font-preview-html.js.map