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
export declare const convertFontToWoff2: (inputPath: string, outputPath: string, inputBuffer?: Uint8Array) => Promise<void>;
export default convertFontToWoff2;
//# sourceMappingURL=convert-font-to-woff2.d.ts.map