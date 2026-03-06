/**
 * Converts a directory name to a human-readable font family name.
 * Splits on hyphens, uppercases words of 1–2 characters (abbreviations like
 * "DM", "XL"), and title-cases all longer words.
 *
 * @example
 * inferFontFamilyName('dm-sans')         // → 'DM Sans'
 * inferFontFamilyName('roboto-condensed') // → 'Roboto Condensed'
 */
export const inferFontFamilyName = (dirName: string): string =>
  dirName
    .split('-')
    .map(word =>
      word.length <= 2
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(' ')

export default inferFontFamilyName
