/**
 * Infers `'italic'` or `'normal'` from a font filename.
 * Oblique fonts are treated as italic.
 *
 * @example
 * inferFontStyle('DMSans-BoldItalic')  // -> 'italic'
 * inferFontStyle('DMSans-BoldOblique') // -> 'italic'
 * inferFontStyle('DMSans-Bold')        // -> 'normal'
 */
export const inferFontStyle = (fileName: string): 'normal' | 'italic' =>
  /italic|oblique/i.test(fileName) ? 'italic' : 'normal'

export default inferFontStyle
