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
 * @param fontFiles - Array of font filenames (e.g. `['DMSans-Bold.ttf', 'DMSans-Italic.otf']`)
 */
export declare const buildFontEntries: (fontFiles: string[]) => FontEntry[];
export default buildFontEntries;
//# sourceMappingURL=build-font-entries.d.ts.map