// Constants
// -----------------------------------------------------------------------------
const INCLUDE_RE = /@include\s+fontFace\s*\(\s*(['"])([^'"]+)\1\s*,\s*(['"])([^'"]+)\3\s*,\s*(\d+)\s*,\s*(['"])(normal|italic)\6\s*\)\s*;?/g;
// Function
// -----------------------------------------------------------------------------
/**
 * Parses all `@include fontFace(...)` calls from generated or hand-edited SCSS
 * content and returns a `FontEntry` list.
 *
 * Only entries with a valid CSS `font-style` value (`normal` or `italic`) are
 * included. Entries with any other style value are silently skipped. Single
 * and double quotes are supported, as is flexible whitespace between
 * arguments.
 *
 * @param scssContent - Raw SCSS string to parse
 *
 * @example
 * ```ts
 * const entries = parseScssEntries(fs.readFileSync('dm-sans.scss', 'utf-8'))
 * // -> [{ normalizedBase: 'dm-sans-regular', weight: 400, style: 'normal' }, ...]
 * ```
 */
export const parseScssEntries = (scssContent) => {
    const entries = [];
    const re = new RegExp(INCLUDE_RE.source, INCLUDE_RE.flags);
    let match;
    while ((match = re.exec(scssContent)) !== null) {
        entries.push({
            normalizedBase: match[4],
            weight: parseInt(match[5], 10),
            style: match[7],
        });
    }
    return entries;
};
export default parseScssEntries;
//# sourceMappingURL=parse-scss-entries.js.map