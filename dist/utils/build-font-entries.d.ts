export type FontEntry = {
    normalizedBase: string;
    weight: number;
    style: 'normal' | 'italic';
};
/**
 * Builds a sorted list of `FontEntry` objects from an array of font filenames.
 * Each entry contains the normalized (hyphenated) base name, inferred weight
 * and inferred style. Results are sorted ascending by weight, then normal
 * before italic within the same weight.
 *
 * Duplicate entries with the same normalized base, weight, and style are
 * removed so generated SCSS does not contain repeated `@include` lines.
 *
 * @param fontFiles - Array of font filenames (e.g. `['DMSans-Bold.ttf', 'DMSans-Italic.otf']`)
 * @returns Sorted and deduplicated font entries
 */
export declare const buildFontEntries: (fontFiles: string[]) => FontEntry[];
export default buildFontEntries;
//# sourceMappingURL=build-font-entries.d.ts.map