// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs';
import path from 'node:path';
// External
// @ts-expect-error — no type declarations available for ttf2woff
import ttf2woff from 'ttf2woff';
// Function
// -----------------------------------------------------------------------------
/**
 * Converts a single TTF or OTF font file to WOFF format and writes the result
 * to the specified output path.
 *
 * @param inputPath - Absolute or relative path to the source `.ttf` / `.otf`
 * file
 * @param outputPath - Absolute or relative path where the `.woff` file will be
 * written
 */
export const convertFontToWoff = (inputPath, outputPath) => {
    const inputBuffer = fs.readFileSync(inputPath);
    const woffResult = ttf2woff(inputBuffer);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, woffResult);
};
export default convertFontToWoff;
//# sourceMappingURL=convert-font-to-woff.js.map