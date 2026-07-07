// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs';
import path from 'node:path';
// External
import ttf2woff2 from 'ttf2woff2';
// Internal
import { loadNativeWoff2Converter } from './load-native-woff2-converter.js';
// Helpers
// -----------------------------------------------------------------------------
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
        const native = loadNativeWoff2Converter();
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