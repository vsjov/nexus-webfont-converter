/**
 * Supported font types that are accepted as input for conversion and generation
 */
export declare const SOURCE_EXTENSIONS: string[];
/**
 * Output web font formats produced by the conversion pipeline
 */
export declare const OUTPUT_FORMATS: readonly ["woff", "woff2"];
/** Union of the string literals in `OUTPUT_FORMATS` (i.e. `'woff' | 'woff2'`).
 * */
export type OutputFormat = typeof OUTPUT_FORMATS[number];
/**
 * Accepted file extensions (and extension-less files) for license files.
 */
export declare const LICENSE_EXTENSIONS: string[];
/**
 * Provides a mapping of numeric font weights to human-readable labels commonly
 * used in font naming conventions. This mapping is used to infer the
 * appropriate label for a font weight based on its numeric value, following the
 * standard CSS font-weight scale. The labels correspond to common weight names
 * such as "Thin", "Regular", "Bold", etc., which are often used in font file
 * names and CSS declarations.
 */
export declare const FONT_WEIGHT: Record<number, string>;
/**
 * Default glyph groups rendered in the font preview HTML page.
 */
export declare const PREVIEW_GLYPHS: ('currency' | 'latin1_supplemental' | 'latin1' | 'latin2' | 'cyrillic')[];
/**
 * Ordered weight keyword map. Longer / more specific patterns are listed first
 * to prevent partial matches (e.g. `extrabold` must be checked before `bold`).
 */
export declare const WEIGHT_MAP: Array<[RegExp, number]>;
//# sourceMappingURL=constants.d.ts.map