// Imports
// -----------------------------------------------------------------------------
// External
import { describe, expect, it } from 'vitest'

// Internal
import { inferFontStyle } from '../infer-font-style.js'


// Tests
// -----------------------------------------------------------------------------
describe('Expect inferFontStyle', () => {
  describe('to return "italic"', () => {
    it('when filename contains "Italic"', () => {
      expect(inferFontStyle('DMSans-BoldItalic')).toBe('italic')
    })

    it('when filename contains "italic" (lowercase)', () => {
      expect(inferFontStyle('dmsans-bolditalic')).toBe('italic')
    })

    it('when filename contains "ITALIC" (uppercase)', () => {
      expect(inferFontStyle('DMSANS-BOLDITALIC')).toBe('italic')
    })

    it('when filename is only "Italic"', () => {
      expect(inferFontStyle('DMSans-Italic')).toBe('italic')
    })
  })

  describe('to return "normal"', () => {
    it('when filename contains no italic keyword', () => {
      expect(inferFontStyle('DMSans-Bold')).toBe('normal')
    })

    it('when filename is a plain font name', () => {
      expect(inferFontStyle('DMSans-Regular')).toBe('normal')
    })

    it('when filename has no style suffix', () => {
      expect(inferFontStyle('Roboto')).toBe('normal')
    })
  })
})
