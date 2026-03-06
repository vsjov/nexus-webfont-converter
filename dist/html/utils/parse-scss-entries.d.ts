import type { FontEntry } from '../../utils/build-font-entries.js';
/**
 * Parses all `@include fontFace(...)` calls from generated SCSS content and
 * returns a `FontEntry` list.
 *
 * Only entries with a valid CSS `font-style` value (`normal` or `italic`) are
 * included. Entries with any other style value are silently skipped.
 *
 * @param scssContent - Raw SCSS string to parse
 *
 * @example
 * ```ts
 * const entries = parseScssEntries(fs.readFileSync('dm-sans.scss', 'utf-8'))
 * // -> [{ normalizedBase: 'dm-sans-regular', weight: 400, style: 'normal' }, ...]
 * ```
 */
export declare const parseScssEntries: (scssContent: string) => FontEntry[];
export default parseScssEntries;
//# sourceMappingURL=parse-scss-entries.d.ts.map