// Imports
// -----------------------------------------------------------------------------
// External
import { describe, expect, it } from 'vitest'

// Internal
import { templateHtmlSamples } from '../template-html-samples.js'

// Types
import type { FontEntry } from '../../../utils/build-font-entries.js'


// Test data
// -----------------------------------------------------------------------------
const singleEntry: FontEntry[] = [
  { normalizedBase: 'dm-sans-regular', weight: 400, style: 'normal' },
]

const multipleEntries: FontEntry[] = [
  { normalizedBase: 'dm-sans-regular', weight: 400, style: 'normal' },
  { normalizedBase: 'dm-sans-italic', weight: 400, style: 'italic' },
  { normalizedBase: 'dm-sans-bold', weight: 700, style: 'normal' },
  { normalizedBase: 'dm-sans-bold-italic', weight: 700, style: 'italic' },
]


// Tests
// -----------------------------------------------------------------------------
describe('Expect templateHtmlSamples', () => {
  describe('to generate a valid HTML5 document', () => {
    it('when given minimal options', () => {
      const result = templateHtmlSamples({
        familyName: 'DM Sans',
        dirName: 'dm-sans',
        entries: singleEntry,
      })

      expect(result).toContain('<!DOCTYPE html>')
      expect(result).toContain('<html lang="en">')
      expect(result).toContain('<meta charset="UTF-8">')
      expect(result).toContain('</html>')
    })
  })

  describe('to include the font family name', () => {
    it('when rendering the title and heading', () => {
      const result = templateHtmlSamples({
        familyName: 'DM Sans',
        dirName: 'dm-sans',
        entries: singleEntry,
      })

      expect(result).toContain('<title>DM Sans - Font Preview</title>')
      expect(result).toContain('<h1>DM Sans</h1>')
    })
  })

  describe('to link the CSS stylesheet', () => {
    it('when using the dirName for the filename', () => {
      const result = templateHtmlSamples({
        familyName: 'DM Sans',
        dirName: 'dm-sans',
        entries: singleEntry,
      })

      expect(result).toContain('<link rel="stylesheet" href="dm-sans.css">')
    })
  })

  describe('to generate variant sections', () => {
    it('when given a Regular variant (400/normal)', () => {
      const result = templateHtmlSamples({
        familyName: 'DM Sans',
        dirName: 'dm-sans',
        entries: [{ normalizedBase: 'dm-sans-regular', weight: 400, style: 'normal' }],
      })

      expect(result).toContain('Regular <span class="variant__meta">400 / normal</span>')
    })

    it('when given an Italic variant (400/italic)', () => {
      const result = templateHtmlSamples({
        familyName: 'DM Sans',
        dirName: 'dm-sans',
        entries: [{ normalizedBase: 'dm-sans-italic', weight: 400, style: 'italic' }],
      })

      expect(result).toContain('Italic <span class="variant__meta">400 / italic</span>')
    })

    it('when given a Bold variant (700/normal)', () => {
      const result = templateHtmlSamples({
        familyName: 'DM Sans',
        dirName: 'dm-sans',
        entries: [{ normalizedBase: 'dm-sans-bold', weight: 700, style: 'normal' }],
      })

      expect(result).toContain('Bold <span class="variant__meta">700 / normal</span>')
    })

    it('when given a Bold Italic variant (700/italic)', () => {
      const result = templateHtmlSamples({
        familyName: 'DM Sans',
        dirName: 'dm-sans',
        entries: [{ normalizedBase: 'dm-sans-bold-italic', weight: 700, style: 'italic' }],
      })

      expect(result).toContain('Bold Italic <span class="variant__meta">700 / italic</span>')
    })

    it('when given multiple variants', () => {
      const result = templateHtmlSamples({
        familyName: 'DM Sans',
        dirName: 'dm-sans',
        entries: multipleEntries,
      })

      expect(result).toContain('Regular <span class="variant__meta">400 / normal</span>')
      expect(result).toContain('Bold <span class="variant__meta">700 / normal</span>')
    })
  })

  describe('to apply correct inline font styles', () => {
    it('when generating variant samples', () => {
      const result = templateHtmlSamples({
        familyName: 'DM Sans',
        dirName: 'dm-sans',
        entries: [{ normalizedBase: 'dm-sans-bold', weight: 700, style: 'normal' }],
      })

      expect(result).toContain('font-family: \'DM Sans\'; font-weight: 700; font-style: normal;')
    })
  })

  describe('to include the standard sample sections', () => {
    it('when generating each variant', () => {
      const result = templateHtmlSamples({
        familyName: 'DM Sans',
        dirName: 'dm-sans',
        entries: singleEntry,
      })

      expect(result).toContain('variant__sample--large')
      expect(result).toContain('variant__sample--small')
      expect(result).toContain('variant__sample--latin')
      expect(result).toContain('variant__sample--digits')
      expect(result).toContain('variant__sample--punctuation')
    })
  })

  describe('to include extra glyph sections', () => {
    it('when glyphs option is provided', () => {
      const result = templateHtmlSamples({
        familyName: 'DM Sans',
        dirName: 'dm-sans',
        entries: singleEntry,
        glyphs: ['currency', 'cyrillic'],
      })

      expect(result).toContain('variant__sample--currency')
      expect(result).toContain('variant__sample--cyrillic')
    })

    it('when glyph key contains underscores', () => {
      const result = templateHtmlSamples({
        familyName: 'DM Sans',
        dirName: 'dm-sans',
        entries: singleEntry,
        glyphs: ['latin_ext_a'],
      })

      expect(result).toContain('variant__sample--latin-ext-a')
    })

    it('when no glyphs are specified', () => {
      const result = templateHtmlSamples({
        familyName: 'DM Sans',
        dirName: 'dm-sans',
        entries: singleEntry,
      })

      expect(result).not.toContain('variant__sample--currency')
      expect(result).not.toContain('variant__sample--cyrillic')
    })
  })

  describe('to include a license footer', () => {
    it('when licenseFile is provided', () => {
      const result = templateHtmlSamples({
        familyName: 'DM Sans',
        dirName: 'dm-sans',
        entries: singleEntry,
        licenseFile: 'LICENSE.txt',
      })

      expect(result).toContain('<footer>')
      expect(result).toContain('<a href="LICENSE.txt"><b>License:</b> LICENSE.txt</a>')
    })

    it('when licenseFile is null', () => {
      const result = templateHtmlSamples({
        familyName: 'DM Sans',
        dirName: 'dm-sans',
        entries: singleEntry,
        licenseFile: null,
      })

      expect(result).not.toContain('<footer>')
    })

    it('when licenseFile is not provided', () => {
      const result = templateHtmlSamples({
        familyName: 'DM Sans',
        dirName: 'dm-sans',
        entries: singleEntry,
      })

      expect(result).not.toContain('<footer>')
    })
  })

  describe('to escape HTML special characters', () => {
    it('when familyName contains HTML injection characters', () => {
      const result = templateHtmlSamples({
        familyName: '<script>alert("xss")</script>',
        dirName: 'test-font',
        entries: singleEntry,
      })

      expect(result).not.toContain('<script>')
      expect(result).toContain('&lt;script&gt;')
    })

    it('when dirName contains a double-quote', () => {
      const result = templateHtmlSamples({
        familyName: 'Test Font',
        dirName: 'test"><script>',
        entries: singleEntry,
      })

      expect(result).not.toContain('"><script>')
      expect(result).toContain('&quot;&gt;&lt;script&gt;')
    })

    it('when licenseFile contains HTML injection characters', () => {
      const result = templateHtmlSamples({
        familyName: 'Test Font',
        dirName: 'test-font',
        entries: singleEntry,
        licenseFile: '"onload="alert(1)',
      })

      expect(result).not.toContain('"onload="')
      expect(result).toContain('&quot;onload=&quot;')
    })
  })
})
