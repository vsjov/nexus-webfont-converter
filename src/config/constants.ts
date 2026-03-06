/**
 * Supported font types that are accepted as input for conversion and generation
 */
export const SOURCE_EXTENSIONS = ['.ttf', '.otf']

/**
 * Accepted file extensions (and extension-less files) for license files.
 */
export const LICENSE_EXTENSIONS = ['.txt', '.md', '.pdf', '']

/**
 * Provides a mapping of numeric font weights to human-readable labels commonly
 * used in font naming conventions. This mapping is used to infer the
 * appropriate label for a font weight based on its numeric value, following the
 * standard CSS font-weight scale. The labels correspond to common weight names
 * such as "Thin", "Regular", "Bold", etc., which are often used in font file
 * names and CSS declarations.
 */
export const FONT_WEIGHT: Record<number, string> = {
  100: 'Thin',
  200: 'Extra Light',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semi Bold',
  700: 'Bold',
  800: 'Extra Bold',
  900: 'Black',
}

/**
 * Default glyph groups rendered in the font preview HTML page.
 */
export const PREVIEW_GLYPHS: ('currency' | 'latin1_supplemental' | 'latin1' | 'latin2' | 'cyrillic')[] = [
  'currency',
  'latin1_supplemental',
  'latin1',
  'latin2',
  'cyrillic',
]

/**
 * Ordered weight keyword map. Longer / more specific patterns are listed first
 * to prevent partial matches (e.g. `extrabold` must be checked before `bold`).
 */
export const WEIGHT_MAP: Array<[RegExp, number]> = [
  [/extralight|extra[-\s]?light/i, 200],
  [/ultralight|ultra[-\s]?light/i, 200],
  [/extrabold|extra[-\s]?bold/i, 800],
  [/ultrabold|ultra[-\s]?bold/i, 800],
  [/semibold|semi[-\s]?bold/i, 600],
  [/demibold|demi[-\s]?bold/i, 600],
  [/thin/i, 100],
  [/light/i, 300],
  [/medium/i, 500],
  [/bold/i, 700],
  [/black/i, 900],
  [/heavy/i, 900],
]

