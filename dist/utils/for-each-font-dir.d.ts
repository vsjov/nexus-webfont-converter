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
declare const forEachFontDir: (inputDir: string, outputDir: string, onWarn: ((message: string) => void) | undefined, fn: (fontDir: string, outputFontDir: string, dirName: string) => void) => void;
export default forEachFontDir;
//# sourceMappingURL=for-each-font-dir.d.ts.map