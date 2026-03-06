// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'

// External
import { afterEach, describe, expect, it, vi } from 'vitest'

// Internal
import { convertFontsInDir } from '../convert-fonts-in-dir.js'


// Mocks
// -----------------------------------------------------------------------------
vi.mock('fancy-log', () => ({ default: vi.fn() }))

vi.mock('../utils/convert-font-to-woff.js', () => ({
  convertFontToWoff: vi.fn(),
}))

vi.mock('../utils/convert-font-to-woff2.js', () => ({
  convertFontToWoff2: vi.fn(),
}))

// Re-import the mocked modules to access the mock functions
const { convertFontToWoff } = await import('../utils/convert-font-to-woff.js')
const { convertFontToWoff2 } = await import('../utils/convert-font-to-woff2.js')


// Tests
// -----------------------------------------------------------------------------
describe('Expect convertFontsInDir', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('to convert TTF files to both WOFF and WOFF2 by default', () => {
    it('when given a directory with font files', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'DMSans-Regular.ttf',
        'DMSans-Bold.ttf',
      ] as never)

      convertFontsInDir('/fonts/dm-sans')

      expect(convertFontToWoff).toHaveBeenCalledTimes(2)
      expect(convertFontToWoff2).toHaveBeenCalledTimes(2)
    })
  })

  describe('to convert only the requested formats', () => {
    it('when formats option is set to woff2 only', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'DMSans-Regular.ttf',
      ] as never)

      convertFontsInDir('/fonts/dm-sans', { formats: ['woff2'] })

      expect(convertFontToWoff).not.toHaveBeenCalled()
      expect(convertFontToWoff2).toHaveBeenCalledTimes(1)
    })

    it('when formats option is set to woff only', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'DMSans-Regular.ttf',
      ] as never)

      convertFontsInDir('/fonts/dm-sans', { formats: ['woff'] })

      expect(convertFontToWoff).toHaveBeenCalledTimes(1)
      expect(convertFontToWoff2).not.toHaveBeenCalled()
    })
  })

  describe('to filter only supported font extensions', () => {
    it('when directory contains mixed file types', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'DMSans-Regular.ttf',
        'DMSans-Bold.otf',
        'README.md',
        'LICENSE.txt',
      ] as never)

      convertFontsInDir('/fonts/dm-sans', { formats: ['woff2'] })

      expect(convertFontToWoff2).toHaveBeenCalledTimes(2)
    })
  })

  describe('to normalize output filenames', () => {
    it('when converting a PascalCase font name', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'DMSans-BoldItalic.ttf',
      ] as never)

      convertFontsInDir('/fonts/dm-sans', { formats: ['woff2'] })

      expect(convertFontToWoff2).toHaveBeenCalledWith(
        '/fonts/dm-sans/DMSans-BoldItalic.ttf',
        expect.stringContaining('dm-sans-bold-italic.woff2')
      )
    })
  })

  describe('to place output in custom outputDir', () => {
    it('when outputDir option is provided', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'DMSans-Regular.ttf',
      ] as never)

      convertFontsInDir('/fonts/dm-sans', {
        outputDir: '/output/dm-sans',
        formats: ['woff2'],
      })

      expect(convertFontToWoff2).toHaveBeenCalledWith(
        '/fonts/dm-sans/DMSans-Regular.ttf',
        '/output/dm-sans/dm-sans-regular.woff2'
      )
    })
  })

  describe('to skip conversion', () => {
    it('when no font files are found in the directory', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'README.md',
        'LICENSE.txt',
      ] as never)

      convertFontsInDir('/fonts/empty')

      expect(convertFontToWoff).not.toHaveBeenCalled()
      expect(convertFontToWoff2).not.toHaveBeenCalled()
    })
  })

  describe('to handle conversion errors gracefully', () => {
    it('when a font conversion throws an error', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'DMSans-Regular.ttf',
      ] as never)

      vi.mocked(convertFontToWoff).mockImplementation(() => {
        throw new Error('conversion failed')
      })

      expect(() => convertFontsInDir('/fonts/dm-sans', { formats: ['woff'] })).not.toThrow()
    })
  })
})
