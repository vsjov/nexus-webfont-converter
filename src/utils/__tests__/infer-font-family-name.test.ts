// Imports
// -----------------------------------------------------------------------------
// External
import { describe, expect, it } from 'vitest'

// Internal
import { inferFontFamilyName } from '../infer-font-family-name.js'


// Tests
// -----------------------------------------------------------------------------
describe('Expect inferFontFamilyName', () => {
  describe('to title-case words longer than 2 characters', () => {
    it('when input is a single word', () => {
      expect(inferFontFamilyName('roboto')).toBe('Roboto')
    })

    it('when input has multiple words', () => {
      expect(inferFontFamilyName('roboto-condensed')).toBe('Roboto Condensed')
    })
  })

  describe('to uppercase words of 1-2 characters (abbreviations)', () => {
    it('when input starts with a 2-letter abbreviation', () => {
      expect(inferFontFamilyName('dm-sans')).toBe('DM Sans')
    })

    it('when input has a single-letter word', () => {
      expect(inferFontFamilyName('a-font')).toBe('A Font')
    })
  })

  describe('to join words with spaces', () => {
    it('when input has multiple hyphen-separated parts', () => {
      expect(inferFontFamilyName('open-sans-condensed')).toBe('Open Sans Condensed')
    })
  })

  describe('to handle mixed abbreviations and words', () => {
    it('when input has abbreviation followed by regular words', () => {
      expect(inferFontFamilyName('dm-sans-serif')).toBe('DM Sans Serif')
    })
  })
})
