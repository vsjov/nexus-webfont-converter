/**
 * Compiles all SCSS files found in the given output directory to minified CSS.
 * Output files are written alongside the source SCSS files with a `.css`
 * extension.
 *
 * @param outputDir - The directory containing generated `.scss` files.
 * @returns Stream that emits `end` on success or `error` on compilation failure
 */
export declare const compileCssFiles: (outputDir: string) => NodeJS.ReadWriteStream;
//# sourceMappingURL=compile-css.d.ts.map