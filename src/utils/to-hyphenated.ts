/**
 * Converts a font filename to lowercase + hyphenated format.
 * Handles CamelCase, PascalCase, spaces and underscores.
 *
 * @example
 * toHyphenated('DMSans-BoldItalic') // → 'dm-sans-bold-italic'
 * toHyphenated('DM Sans Medium Italic') // → 'dm-sans-medium-italic'
 */
export const toHyphenated = (name: string): string =>
  name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2') // DMSans → DM-Sans
    .replace(/([a-z\d])([A-Z])/g, '$1-$2') // boldItalic → bold-Italic
    .replace(/[\s_]+/g, '-') // spaces / underscores → hyphens
    .replace(/-+/g, '-') // collapse consecutive hyphens
    .toLowerCase()

export default toHyphenated
