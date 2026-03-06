/**
 * Infers `'italic'` or `'normal'` from a font filename.
 *
 * @example
 * inferFontStyle('DMSans-BoldItalic') // → 'italic'
 * inferFontStyle('DMSans-Bold')       // → 'normal'
 */
export const inferFontStyle = (fileName) => /italic/i.test(fileName) ? 'italic' : 'normal';
export default inferFontStyle;
//# sourceMappingURL=infer-font-style.js.map