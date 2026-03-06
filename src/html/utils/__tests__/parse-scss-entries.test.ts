// Imports
// -----------------------------------------------------------------------------
// External
import { afterEach, describe, expect, it, vi } from 'vitest'

// Internal
import { parseScssEntries } from '../parse-scss-entries.js'


// Mocks
// -----------------------------------------------------------------------------
vi.mock('fancy-log', () => ({ default: vi.fn() }))


// Tests
// -----------------------------------------------------------------------------
describe('Expect parseScssEntries', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('to return an empty array', () => {
    it('when content has no @include fontFace lines', () => {
      expect(parseScssEntries('// Font Weight Guide\n@mixin fontFace($a, $b, $c, $d) {}')).toEqual([])
    })

    it('when content is an empty string', () => {
      expect(parseScssEntries('')).toEqual([])
    })
  })

  describe('to return a single entry', () => {
    it('when content has one @include fontFace line', () => {
      const scss = `@include fontFace("DM Sans", "dm-sans-regular", 400, "normal");`

      expect(parseScssEntries(scss)).toEqual([
        { normalizedBase: 'dm-sans-regular', weight: 400, style: 'normal' },
      ])
    })

    it('when style is italic', () => {
      const scss = `@include fontFace("DM Sans", "dm-sans-bold-italic", 700, "italic");`

      expect(parseScssEntries(scss)).toEqual([
        { normalizedBase: 'dm-sans-bold-italic', weight: 700, style: 'italic' },
      ])
    })
  })

  describe('to return multiple entries', () => {
    it('when content has several @include lines', () => {
      const scss = [
        `@include fontFace("DM Sans", "dm-sans-regular", 400, "normal");`,
        `@include fontFace("DM Sans", "dm-sans-italic", 400, "italic");`,
        `@include fontFace("DM Sans", "dm-sans-bold", 700, "normal");`,
        `@include fontFace("DM Sans", "dm-sans-bold-italic", 700, "italic");`,
      ].join('\n')

      expect(parseScssEntries(scss)).toEqual([
        { normalizedBase: 'dm-sans-regular', weight: 400, style: 'normal' },
        { normalizedBase: 'dm-sans-italic', weight: 400, style: 'italic' },
        { normalizedBase: 'dm-sans-bold', weight: 700, style: 'normal' },
        { normalizedBase: 'dm-sans-bold-italic', weight: 700, style: 'italic' },
      ])
    })

    it('when includes appear inside a full generated SCSS file', () => {
      const scss = `// Font Weight Guide
// -----------------
// 400 - regular

@mixin fontFace($fontName, $fileName, $fontWeight, $fontStyle) {
  @font-face {
    font-family: "#{$fontName}";
    src: url("#{$fileName}.woff2") format("woff2");
    font-weight: #{$fontWeight};
    font-style: #{$fontStyle};
  }
}

// Regular
@include fontFace("DM Sans", "dm-sans-regular", 400, "normal");
// Bold
@include fontFace("DM Sans", "dm-sans-bold", 700, "normal");
`

      expect(parseScssEntries(scss)).toEqual([
        { normalizedBase: 'dm-sans-regular', weight: 400, style: 'normal' },
        { normalizedBase: 'dm-sans-bold', weight: 700, style: 'normal' },
      ])
    })
  })

  describe('to ignore non-matching signatures', () => {
    it('when an include uses a different mixin name', () => {
      const scss = `@include otherMixin("DM Sans", "dm-sans-regular", 400, "normal");`

      expect(parseScssEntries(scss)).toEqual([])
    })

    it('when an include has an invalid style value', () => {
      const scss = `@include fontFace("DM Sans", "dm-sans-bold", 700, "bold");`

      expect(parseScssEntries(scss)).toEqual([])
    })
  })
})
