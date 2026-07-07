// Imports
// -----------------------------------------------------------------------------
// NodeJS
import { extname, basename } from 'node:path';
// Internal
import { toHyphenated } from './to-hyphenated.js';
import { inferFontWeight } from './infer-font-weight.js';
import { inferFontStyle } from './infer-font-style.js';
// Functions
// -----------------------------------------------------------------------------
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
export const buildFontEntries = (fontFiles) => {
    const entriesByKey = new Map();
    for (const file of fontFiles) {
        const raw = basename(file, extname(file));
        const entry = {
            normalizedBase: toHyphenated(raw),
            weight: inferFontWeight(raw),
            style: inferFontStyle(raw),
        };
        const key = `${entry.normalizedBase}:${entry.weight}:${entry.style}`;
        if (!entriesByKey.has(key))
            entriesByKey.set(key, entry);
    }
    const entries = Array.from(entriesByKey.values());
    entries.sort((a, b) => {
        if (a.weight !== b.weight)
            return a.weight - b.weight;
        if (a.style === b.style)
            return a.normalizedBase.localeCompare(b.normalizedBase);
        return a.style === 'normal' ? -1 : 1;
    });
    return entries;
};
export default buildFontEntries;
//# sourceMappingURL=build-font-entries.js.map