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
export declare const regenerateFontPreviewHtml: (outputDir: string) => void;
export default regenerateFontPreviewHtml;
//# sourceMappingURL=regenerate-font-preview-html.d.ts.map