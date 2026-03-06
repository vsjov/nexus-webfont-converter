// Imports
// -----------------------------------------------------------------------------
// NodeJS
import { extname, basename } from 'node:path'

// Internal
import { toHyphenated } from './to-hyphenated.js'
import { inferFontWeight } from './infer-font-weight.js'
import { inferFontStyle } from './infer-font-style.js'


// Types
// -----------------------------------------------------------------------------
export type FontEntry = {
  normalizedBase: string,
  weight: number,
  style: 'normal' | 'italic',
}


// Functions
// -----------------------------------------------------------------------------

/**
 * Builds a sorted list of `FontEntry` objects from an array of font filenames.
 * Each entry contains the normalized (hyphenated) base name, inferred weight
 * and inferred style. Results are sorted ascending by weight, then normal
 * before italic within the same weight.
 *
 * @param fontFiles - Array of font filenames (e.g. `['DMSans-Bold.ttf', 'DMSans-Italic.otf']`)
 */
export const buildFontEntries = (fontFiles: string[]): FontEntry[] => {
  const entries: FontEntry[] = fontFiles.map(file => {
    const raw = basename(file, extname(file))

    return {
      normalizedBase: toHyphenated(raw),
      weight: inferFontWeight(raw),
      style: inferFontStyle(raw),
    }
  })

  entries.sort((a, b) => {
    if (a.weight !== b.weight) return a.weight - b.weight

    return a.style === 'normal' ? -1 : 1
  })

  return entries
}

export default buildFontEntries
