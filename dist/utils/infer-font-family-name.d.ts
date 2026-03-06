/**
 * Converts a directory name to a human-readable font family name.
 * Splits on hyphens, uppercases words of 1-2 characters (abbreviations like
 * "DM", "XL"), and title-cases all longer words.
 *
 * @example
 * inferFontFamilyName('dm-sans')         // -> 'DM Sans'
 * inferFontFamilyName('roboto-condensed') // -> 'Roboto Condensed'
 */
export declare const inferFontFamilyName: (dirName: string) => string;
export default inferFontFamilyName;
//# sourceMappingURL=infer-font-family-name.d.ts.map