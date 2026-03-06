/**
 * Removes web font files (`.woff`, `.woff2`) from each font family
 * subdirectory of `outputDir` that are no longer referenced by the
 * corresponding `[font-name].scss` file.
 *
 * Font files whose basename (without extension) does not match any
 * `$fileName` argument in an `@include fontFace(...)` call in the SCSS are
 * considered unused and deleted.
 *
 * Subdirectories without a `.scss` file are skipped entirely.
 *
 * @param outputDir - Root output directory containing per-family subdirectories
 *                    (e.g. `build/out/`)
 *
 * @example
 * ```ts
 * removeUnusedFonts('./build/out')
 * // -> deletes build/out/dm-sans/dm-sans-medium.woff if dm-sans.scss has no
 * //   @include that references "dm-sans-medium"
 * ```
 */
export declare const removeUnusedFonts: (outputDir: string) => void;
export default removeUnusedFonts;
//# sourceMappingURL=remove-unused-fonts.d.ts.map