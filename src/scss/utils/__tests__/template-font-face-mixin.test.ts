// Imports
// -----------------------------------------------------------------------------
// External
import { describe, expect, it } from 'vitest'

// Internal
import { templateFontFaceMixin } from '../template-font-face-mixin.js'


// Tests
// -----------------------------------------------------------------------------
describe('Expect templateFontFaceMixin', () => {
  describe('to generate a valid SCSS mixin', () => {
    it('when given woff2 and woff formats', () => {
      const result = templateFontFaceMixin(['.woff2', '.woff'])

      expect(result).toMatchInlineSnapshot(`
        "// Font Weight Guide
        // -----------------
        // 100 - thin
        // 200 - extralight
        // 300 - light
        // 400 - regular / normal
        // 500 - medium
        // 600 - semi-bold
        // 700 - bold
        // 800 - extrabold
        // 900 - black / heavy

        // Font Face Mixin
        @mixin fontFace($fontName, $fileName, $fontWeight, $fontStyle) {
          @font-face {
            font-family: "#{$fontName}";
            src: url("#{$fileName}.woff2") format("woff2"),
                 url("#{$fileName}.woff") format("woff");
            font-weight: #{$fontWeight};
            font-style: #{$fontStyle};
            font-display: swap;
          }
        }
        "
      `)
    })

    it('when given only woff2 format', () => {
      const result = templateFontFaceMixin(['.woff2'])

      expect(result).toMatchInlineSnapshot(`
        "// Font Weight Guide
        // -----------------
        // 100 - thin
        // 200 - extralight
        // 300 - light
        // 400 - regular / normal
        // 500 - medium
        // 600 - semi-bold
        // 700 - bold
        // 800 - extrabold
        // 900 - black / heavy

        // Font Face Mixin
        @mixin fontFace($fontName, $fileName, $fontWeight, $fontStyle) {
          @font-face {
            font-family: "#{$fontName}";
            src: url("#{$fileName}.woff2") format("woff2");
            font-weight: #{$fontWeight};
            font-style: #{$fontStyle};
            font-display: swap;
          }
        }
        "
      `)
    })

    it('when given all four formats', () => {
      const result = templateFontFaceMixin(['.woff2', '.woff', '.ttf', '.otf'])

      expect(result).toMatchInlineSnapshot(`
        "// Font Weight Guide
        // -----------------
        // 100 - thin
        // 200 - extralight
        // 300 - light
        // 400 - regular / normal
        // 500 - medium
        // 600 - semi-bold
        // 700 - bold
        // 800 - extrabold
        // 900 - black / heavy

        // Font Face Mixin
        @mixin fontFace($fontName, $fileName, $fontWeight, $fontStyle) {
          @font-face {
            font-family: "#{$fontName}";
            src: url("#{$fileName}.woff2") format("woff2"),
                 url("#{$fileName}.woff") format("woff"),
                 url("#{$fileName}.ttf") format("truetype"),
                 url("#{$fileName}.otf") format("opentype");
            font-weight: #{$fontWeight};
            font-style: #{$fontStyle};
            font-display: swap;
          }
        }
        "
      `)
    })
  })

  describe('to include the font weight guide comment', () => {
    it('when generating any template', () => {
      const result = templateFontFaceMixin(['.woff2'])

      expect(result).toContain('// Font Weight Guide')
      expect(result).toContain('// 400 - regular / normal')
      expect(result).toContain('// 700 - bold')
    })
  })

  describe('to include the correct format labels', () => {
    it('when format is .woff2', () => {
      const result = templateFontFaceMixin(['.woff2'])

      expect(result).toContain('format("woff2")')
    })

    it('when format is .woff', () => {
      const result = templateFontFaceMixin(['.woff'])

      expect(result).toContain('format("woff")')
    })

    it('when format is .ttf', () => {
      const result = templateFontFaceMixin(['.ttf'])

      expect(result).toContain('format("truetype")')
    })

    it('when format is .otf', () => {
      const result = templateFontFaceMixin(['.otf'])

      expect(result).toContain('format("opentype")')
    })
  })

  describe('to use commas between multiple src lines and semicolon at the end', () => {
    it('when given two formats', () => {
      const result = templateFontFaceMixin(['.woff2', '.woff'])

      expect(result).toContain('format("woff2"),')
      expect(result).toContain('format("woff");')
    })
  })

  describe('to include font-display: swap', () => {
    it('when generating the mixin', () => {
      const result = templateFontFaceMixin(['.woff2'])

      expect(result).toContain('font-display: swap;')
    })
  })
})
