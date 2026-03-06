// Imports
// -----------------------------------------------------------------------------
// Internal
import type { FontEntry } from '../../utils/build-font-entries.js'


// Constants
// -----------------------------------------------------------------------------
const INCLUDE_RE = /@include fontFace\("([^"]+)",\s*"([^"]+)",\s*(\d+),\s*"(normal|italic)"\)/g


// Function
// -----------------------------------------------------------------------------
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
export const parseScssEntries = (scssContent: string): FontEntry[] => {
  const entries: FontEntry[] = []
  const re = new RegExp(INCLUDE_RE.source, INCLUDE_RE.flags)
  let match

  while ((match = re.exec(scssContent)) !== null) {
    entries.push({
      normalizedBase: match[2],
      weight: parseInt(match[3], 10),
      style: match[4] as 'normal' | 'italic',
    })
  }

  return entries
}

export default parseScssEntries
