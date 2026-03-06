// Imports
// -----------------------------------------------------------------------------
// External
import { describe, expect, it } from 'vitest'

// Internal
import { toHyphenated } from '../to-hyphenated.js'


// Tests
// -----------------------------------------------------------------------------
describe('Expect toHyphenated', () => {
  describe('to convert PascalCase names', () => {
    it('when input is a simple PascalCase font name', () => {
      expect(toHyphenated('DMSans')).toBe('dm-sans')
    })

    it('when input has consecutive uppercase letters followed by lowercase', () => {
      expect(toHyphenated('DMSansBold')).toBe('dm-sans-bold')
    })
  })

  describe('to convert CamelCase with weight suffixes', () => {
    it('when input includes a weight keyword', () => {
      expect(toHyphenated('DMSans-Bold')).toBe('dm-sans-bold')
    })

    it('when input includes weight and style', () => {
      expect(toHyphenated('DMSans-BoldItalic')).toBe('dm-sans-bold-italic')
    })

    it('when input has multiple weight keywords', () => {
      expect(toHyphenated('Roboto-ExtraLight')).toBe('roboto-extra-light')
    })
  })

  describe('to handle spaces and underscores', () => {
    it('when input contains spaces', () => {
      expect(toHyphenated('DM Sans Medium Italic')).toBe('dm-sans-medium-italic')
    })

    it('when input contains underscores', () => {
      expect(toHyphenated('DM_Sans_Bold')).toBe('dm-sans-bold')
    })

    it('when input contains mixed separators', () => {
      expect(toHyphenated('DM_Sans Bold-Italic')).toBe('dm-sans-bold-italic')
    })
  })

  describe('to collapse consecutive hyphens', () => {
    it('when input produces multiple hyphens', () => {
      expect(toHyphenated('Font--Name')).toBe('font-name')
    })
  })

  describe('to return lowercase', () => {
    it('when input is already lowercase', () => {
      expect(toHyphenated('roboto')).toBe('roboto')
    })

    it('when input is all uppercase', () => {
      expect(toHyphenated('ROBOTO')).toBe('roboto')
    })
  })

  describe('to handle single-word names', () => {
    it('when input has no separators', () => {
      expect(toHyphenated('Roboto')).toBe('roboto')
    })
  })
})
