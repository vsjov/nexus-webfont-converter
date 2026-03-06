/**
 * A set of sample glyphs used in different character sets:
 * - `sample`: A pangram containing all letters of the English alphabet
 * - `digits`: The ten Arabic numerals (0-9)
 * - `punctuation`: Common punctuation marks and symbols
 * - `currency`: A variety of currency symbols from around the world
 * - `latin`: Uppercase and lowercase letters of the basic Latin alphabet
 * - `cyrillic`: Uppercase and lowercase letters of the Serbian Cyrillic
 *   alphabet
 * - `latin1`: Extended Latin characters from the ISO-8859-1 character set
 * - `latin1_supplemental`: Symbols and punctuation from the ISO-8859-1
 *   character set
 * - `latin2`: Extended Latin characters from the ISO-8859-2 character set
 * - `latin_ext_a`: Extended Latin characters from Unicode block U+0100 to
 *   U+017F
 * - `latin_ext_b`: Extended Latin characters from Unicode block U+0180 to
 *   U+024F
 */
export declare const GLYPHS: {
    sample: string;
    digits: string;
    punctuation: string;
    currency: string;
    latin: string;
    cyrillic: string;
    latin1: string;
    latin1_supplemental: string;
    latin2: string;
    latin_ext_a: string;
    latin_ext_b: string;
};
export type GlyphKey = keyof typeof GLYPHS;
export default GLYPHS;
//# sourceMappingURL=glyphs.d.ts.map