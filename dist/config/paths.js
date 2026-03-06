// Imports
// -----------------------------------------------------------------------------
// Nodejs
import path from 'node:path';
// Local
import { setOptions } from '../dev-tools/utils/set-options.js';
/**
 * Generates dynamic paths for the webfont converter.  All paths are relative to
 * the package root.
 *
 * @param parameters - Configuration parameters.
 * @param parameters.rootDir - The root directory for the converter (default:
 * './')
 * @param parameters.inputDir - The input directory containing TTF/OTF files
 * (required)
 * @param parameters.outputDir - The output directory for converted WOFF/WOFF2
 * files (required)
 * @returns An object containing the resolved input and output paths for font
 * conversion.
 */
export const fontConverterPaths = (parameters) => {
    const DEFAULTS = {
        rootDir: './', // relative to the package root
        inputDir: null, // relative to rootDir
        outputDir: null, // relative to rootDir
    };
    const OPTIONS = setOptions(DEFAULTS, parameters);
    // Error handling
    if (!OPTIONS.inputDir) {
        throw new Error('`inputDir` is required');
    }
    if (!OPTIONS.outputDir) {
        throw new Error('`outputDir` is required');
    }
    const paths = {
        convert: {
            in: path.join(OPTIONS.rootDir, OPTIONS.inputDir),
            out: path.join(OPTIONS.rootDir, OPTIONS.outputDir),
        },
    };
    return paths;
};
//# sourceMappingURL=paths.js.map