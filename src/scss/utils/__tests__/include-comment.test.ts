// Imports
// -----------------------------------------------------------------------------
// External
import { describe, expect, it } from 'vitest'

// Internal
import { includeComment } from '../include-comment.js'


// Tests
// -----------------------------------------------------------------------------
describe('Expect includeComment', () => {
  describe('to return "Normal"', () => {
    it('when weight is 400 and style is normal', () => {
      expect(includeComment(400, 'normal')).toBe('Normal')
    })
  })

  describe('to return "Italic"', () => {
    it('when weight is 400 and style is italic', () => {
      expect(includeComment(400, 'italic')).toBe('Italic')
    })
  })

  describe('to return the weight label', () => {
    it('when weight is 100 and style is normal', () => {
      expect(includeComment(100, 'normal')).toBe('Thin')
    })

    it('when weight is 200 and style is normal', () => {
      expect(includeComment(200, 'normal')).toBe('Extra Light')
    })

    it('when weight is 300 and style is normal', () => {
      expect(includeComment(300, 'normal')).toBe('Light')
    })

    it('when weight is 500 and style is normal', () => {
      expect(includeComment(500, 'normal')).toBe('Medium')
    })

    it('when weight is 600 and style is normal', () => {
      expect(includeComment(600, 'normal')).toBe('Semi Bold')
    })

    it('when weight is 700 and style is normal', () => {
      expect(includeComment(700, 'normal')).toBe('Bold')
    })

    it('when weight is 800 and style is normal', () => {
      expect(includeComment(800, 'normal')).toBe('Extra Bold')
    })

    it('when weight is 900 and style is normal', () => {
      expect(includeComment(900, 'normal')).toBe('Black')
    })
  })

  describe('to return the weight label with " Italic" suffix', () => {
    it('when weight is 700 and style is italic', () => {
      expect(includeComment(700, 'italic')).toBe('Bold Italic')
    })

    it('when weight is 300 and style is italic', () => {
      expect(includeComment(300, 'italic')).toBe('Light Italic')
    })

    it('when weight is 900 and style is italic', () => {
      expect(includeComment(900, 'italic')).toBe('Black Italic')
    })
  })

  describe('to fall back to the numeric weight string', () => {
    it('when weight is not in the FONT_WEIGHT map', () => {
      expect(includeComment(450, 'normal')).toBe('450')
    })

    it('when weight is unknown and style is italic', () => {
      expect(includeComment(450, 'italic')).toBe('450 Italic')
    })
  })
})
