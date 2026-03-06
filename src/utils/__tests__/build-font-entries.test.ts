// Imports
// -----------------------------------------------------------------------------
// External
import { describe, expect, it } from 'vitest'

// Internal
import { buildFontEntries } from '../build-font-entries.js'


// Tests
// -----------------------------------------------------------------------------
describe('Expect buildFontEntries', () => {
  describe('to build correct entries from font filenames', () => {
    it('when given a single TTF file', () => {
      const result = buildFontEntries(['DMSans-Regular.ttf'])

      expect(result).toEqual([{
        normalizedBase: 'dm-sans-regular',
        weight: 400,
        style: 'normal',
      }])
    })

    it('when given an OTF file', () => {
      const result = buildFontEntries(['Roboto-Bold.otf'])

      expect(result).toEqual([{
        normalizedBase: 'roboto-bold',
        weight: 700,
        style: 'normal',
      }])
    })

    it('when given an italic font file', () => {
      const result = buildFontEntries(['DMSans-BoldItalic.ttf'])

      expect(result).toEqual([{
        normalizedBase: 'dm-sans-bold-italic',
        weight: 700,
        style: 'italic',
      }])
    })
  })

  describe('to sort entries by weight ascending', () => {
    it('when given fonts with different weights', () => {
      const result = buildFontEntries([
        'DMSans-Bold.ttf',
        'DMSans-Light.ttf',
        'DMSans-Regular.ttf',
      ])

      expect(result.map(e => e.weight)).toEqual([300, 400, 700])
    })
  })

  describe('to sort normal before italic within the same weight', () => {
    it('when given both normal and italic variants', () => {
      const result = buildFontEntries([
        'DMSans-BoldItalic.ttf',
        'DMSans-Bold.ttf',
      ])

      expect(result).toEqual([
        {
          normalizedBase: 'dm-sans-bold',
          weight: 700,
          style: 'normal',
        },
        {
          normalizedBase: 'dm-sans-bold-italic',
          weight: 700,
          style: 'italic',
        },
      ])
    })
  })

  describe('to handle a complete font family', () => {
    it('when given multiple weights and styles', () => {
      const result = buildFontEntries([
        'DMSans-ExtraBold.ttf',
        'DMSans-LightItalic.ttf',
        'DMSans-Regular.ttf',
        'DMSans-BoldItalic.ttf',
        'DMSans-Light.ttf',
        'DMSans-Bold.ttf',
        'DMSans-Italic.ttf',
      ])

      expect(result.map(e => `${e.weight}/${e.style}`)).toEqual([
        '300/normal',
        '300/italic',
        '400/normal',
        '400/italic',
        '700/normal',
        '700/italic',
        '800/normal',
      ])
    })
  })

  describe('to return an empty array', () => {
    it('when given an empty input', () => {
      expect(buildFontEntries([])).toEqual([])
    })
  })
})
