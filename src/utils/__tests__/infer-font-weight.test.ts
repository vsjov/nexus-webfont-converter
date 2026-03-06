// Imports
// -----------------------------------------------------------------------------
// External
import { describe, expect, it } from 'vitest'

// Internal
import { inferFontWeight } from '../infer-font-weight.js'


// Tests
// -----------------------------------------------------------------------------
describe('Expect inferFontWeight', () => {
  describe('to return 100', () => {
    it('when filename contains "Thin"', () => {
      expect(inferFontWeight('Roboto-Thin')).toBe(100)
    })

    it('when filename contains "thin" (case-insensitive)', () => {
      expect(inferFontWeight('roboto-thin')).toBe(100)
    })
  })

  describe('to return 200', () => {
    it('when filename contains "ExtraLight"', () => {
      expect(inferFontWeight('Roboto-ExtraLight')).toBe(200)
    })

    it('when filename contains "Extra-Light"', () => {
      expect(inferFontWeight('Roboto-Extra-Light')).toBe(200)
    })

    it('when filename contains "UltraLight"', () => {
      expect(inferFontWeight('Roboto-UltraLight')).toBe(200)
    })

    it('when filename contains "Ultra Light"', () => {
      expect(inferFontWeight('Roboto-Ultra Light')).toBe(200)
    })
  })

  describe('to return 300', () => {
    it('when filename contains "Light"', () => {
      expect(inferFontWeight('DMSans-Light')).toBe(300)
    })

    it('when filename contains "LightItalic"', () => {
      expect(inferFontWeight('DMSans-LightItalic')).toBe(300)
    })
  })

  describe('to return 400 (fallback)', () => {
    it('when filename contains "Regular"', () => {
      expect(inferFontWeight('DMSans-Regular')).toBe(400)
    })

    it('when filename has no weight keyword', () => {
      expect(inferFontWeight('DMSans')).toBe(400)
    })

    it('when filename contains only "Italic"', () => {
      expect(inferFontWeight('DMSans-Italic')).toBe(400)
    })
  })

  describe('to return 500', () => {
    it('when filename contains "Medium"', () => {
      expect(inferFontWeight('DMSans-Medium')).toBe(500)
    })

    it('when filename contains "MediumItalic"', () => {
      expect(inferFontWeight('DMSans-MediumItalic')).toBe(500)
    })
  })

  describe('to return 600', () => {
    it('when filename contains "SemiBold"', () => {
      expect(inferFontWeight('DMSans-SemiBold')).toBe(600)
    })

    it('when filename contains "Semi-Bold"', () => {
      expect(inferFontWeight('DMSans-Semi-Bold')).toBe(600)
    })

    it('when filename contains "DemiBold"', () => {
      expect(inferFontWeight('DMSans-DemiBold')).toBe(600)
    })

    it('when filename contains "Demi Bold"', () => {
      expect(inferFontWeight('DMSans-Demi Bold')).toBe(600)
    })
  })

  describe('to return 700', () => {
    it('when filename contains "Bold"', () => {
      expect(inferFontWeight('DMSans-Bold')).toBe(700)
    })

    it('when filename contains "BoldItalic"', () => {
      expect(inferFontWeight('DMSans-BoldItalic')).toBe(700)
    })
  })

  describe('to return 800', () => {
    it('when filename contains "ExtraBold"', () => {
      expect(inferFontWeight('DMSans-ExtraBold')).toBe(800)
    })

    it('when filename contains "Extra-Bold"', () => {
      expect(inferFontWeight('DMSans-Extra-Bold')).toBe(800)
    })

    it('when filename contains "UltraBold"', () => {
      expect(inferFontWeight('DMSans-UltraBold')).toBe(800)
    })
  })

  describe('to return 900', () => {
    it('when filename contains "Black"', () => {
      expect(inferFontWeight('DMSans-Black')).toBe(900)
    })

    it('when filename contains "Heavy"', () => {
      expect(inferFontWeight('DMSans-Heavy')).toBe(900)
    })
  })

  describe('to prioritize longer patterns', () => {
    it('when "ExtraBold" is matched before "Bold"', () => {
      expect(inferFontWeight('Font-ExtraBold')).toBe(800)
    })

    it('when "SemiBold" is matched before "Bold"', () => {
      expect(inferFontWeight('Font-SemiBold')).toBe(600)
    })

    it('when "ExtraLight" is matched before "Light"', () => {
      expect(inferFontWeight('Font-ExtraLight')).toBe(200)
    })
  })
})
