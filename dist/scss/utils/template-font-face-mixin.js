// Constants
// -----------------------------------------------------------------------------
const FORMAT_LABELS = {
    '.woff2': 'woff2',
    '.woff': 'woff',
    '.ttf': 'truetype',
    '.otf': 'opentype',
};
const FONT_WEIGHT_GUIDE = `// Font Weight Guide
// -----------------
// 100 - thin
// 200 - extralight
// 300 - light
// 400 - regular / normal
// 500 - medium
// 600 - semi-bold
// 700 - bold
// 800 - extrabold
// 900 - black / heavy`;
// Function
// -----------------------------------------------------------------------------
/**
 * Builds the SCSS header including the `@mixin fontFace` definition with a
 * `src` block containing only the detected font formats.
 *
 * @param detectedFormats - File extensions present in the output directory (e.g. `['.woff2', '.woff']`)
 */
export const templateFontFaceMixin = (detectedFormats) => {
    const srcLines = detectedFormats
        .map((ext, i) => {
        const format = FORMAT_LABELS[ext];
        const line = `    src: url("#{$fileName}${ext}") format("${format}")`;
        const isLast = i === detectedFormats.length - 1;
        return i === 0 ? line + (isLast ? ';' : ',') : `         url("#{$fileName}${ext}") format("${format}")` + (isLast ? ';' : ',');
    });
    const fontFaceMixinTemplate = `${FONT_WEIGHT_GUIDE}

// Font Face Mixin
@mixin fontFace($fontName, $fileName, $fontWeight, $fontStyle) {
  @font-face {
    font-family: "#{$fontName}";
${srcLines.join('\n')}
    font-weight: #{$fontWeight};
    font-style: #{$fontStyle};
    font-display: swap;
  }
}
`;
    return fontFaceMixinTemplate;
};
export default templateFontFaceMixin;
//# sourceMappingURL=template-font-face-mixin.js.map