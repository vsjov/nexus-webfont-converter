/**
 * Converts a font filename to lowercase + hyphenated format.
 * Handles CamelCase, PascalCase, spaces and underscores.
 *
 * @example
 * toHyphenated('DMSans-BoldItalic') // -> 'dm-sans-bold-italic'
 * toHyphenated('DM Sans Medium Italic') // -> 'dm-sans-medium-italic'
 */
export declare const toHyphenated: (name: string) => string;
export default toHyphenated;
//# sourceMappingURL=to-hyphenated.d.ts.map