// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
// External
import ttf2woff2 from 'ttf2woff2';
// Constants
// -----------------------------------------------------------------------------
const require = createRequire(import.meta.url);
// State
// -----------------------------------------------------------------------------
let nativeConverter;
// Helpers
// -----------------------------------------------------------------------------
/**
 * Loads the native `ttf2woff2` addon directly when it is available.
 *
 * The upstream package currently falls back to WASM when its ESM wrapper
 * cannot call the CommonJS `bindings` helper correctly. Loading the compiled
 * addon directly keeps the fast native path available while preserving the
 * package fallback for environments where native loading is not possible.
 *
 * @returns Native converter function, or `null` when it cannot be loaded.
 */
const loadNativeConverter = () => {
    if (nativeConverter !== undefined)
        return nativeConverter;
    try {
        const packageDir = path.dirname(require.resolve('ttf2woff2/package.json'));
        const addon = require(path.join(packageDir, 'build/Release/addon.node'));
        nativeConverter = addon.convert;
    }
    catch {
        nativeConverter = null;
    }
    return nativeConverter;
};
/**
 * Converts a font buffer to WOFF2 using the fastest available converter.
 *
 * @param sourceBuffer - Source font bytes
 * @returns WOFF2 font bytes
 * @throws When native conversion is requested but the native addon is unavailable
 */
const convertBufferToWoff2 = (sourceBuffer) => {
    const requestedVersion = process.env['TTF2WOFF2_VERSION']?.toLowerCase();
    if (requestedVersion !== 'wasm') {
        const native = loadNativeConverter();
        if (native)
            return native(sourceBuffer);
        if (requestedVersion === 'native') {
            throw new Error('Native ttf2woff2 addon is not available.');
        }
    }
    return ttf2woff2(sourceBuffer);
};
// Function
// -----------------------------------------------------------------------------
/**
 * Converts a single TTF or OTF font file to WOFF2 format and writes the result
 * to the specified output path.
 *
 * @param inputPath - Absolute or relative path to the source `.ttf` / `.otf`
 * file
 * @param outputPath - Absolute or relative path where the `.woff2` file will be
 * written
 * @param inputBuffer - Optional pre-read source font buffer
 * @returns Resolves after the WOFF2 file is written
 */
export const convertFontToWoff2 = async (inputPath, outputPath, inputBuffer) => {
    const sourceBuffer = inputBuffer ?? (await fs.promises.readFile(inputPath));
    const woff2Buffer = convertBufferToWoff2(sourceBuffer);
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(outputPath, woff2Buffer);
};
export default convertFontToWoff2;
//# sourceMappingURL=convert-font-to-woff2.js.map