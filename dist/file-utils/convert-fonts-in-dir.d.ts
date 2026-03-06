export type FontConversionFormat = 'woff' | 'woff2';
export type ConvertFontsInDirOptions = {
    outputDir?: string;
    formats?: FontConversionFormat[];
};
/**
 * Recursively scans `dirPath` for all `*.ttf` and `*.otf` files and converts
 * them to the requested web font formats using a pool of worker threads for
 * true CPU parallelism. Each output file is placed alongside the source file
 * by default, or inside `options.outputDir` when provided (preserving the
 * relative sub-directory structure).
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
export declare const convertFontsInDir: (dirPath: string, options?: ConvertFontsInDirOptions) => Promise<void>;
export default convertFontsInDir;
//# sourceMappingURL=convert-fonts-in-dir.d.ts.map