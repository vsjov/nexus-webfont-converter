// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'

// External
import { afterEach, describe, expect, it, vi } from 'vitest'

// Internal
import { generateFontPreviewHtml } from '../generate-font-preview-html.js'


// Mocks
// -----------------------------------------------------------------------------

vi.mock('../utils/generate-html-for-dir.js', () => ({
  generateHtmlForDir: vi.fn(),
}))

const { generateHtmlForDir } = await import('../utils/generate-html-for-dir.js')


// Tests
// -----------------------------------------------------------------------------
describe('Expect generateFontPreviewHtml', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('to call generateHtmlForDir for each font subdirectory', () => {
    it('when input directory contains font subdirectories', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue(['dm-sans', 'roboto'] as never)

      vi.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => true } as never)

      generateFontPreviewHtml('/input', '/output')

      expect(generateHtmlForDir).toHaveBeenCalledTimes(2)
      expect(generateHtmlForDir).toHaveBeenCalledWith('/input/dm-sans', '/output/dm-sans', 'dm-sans', expect.any(Object))
      expect(generateHtmlForDir).toHaveBeenCalledWith('/input/roboto', '/output/roboto', 'roboto', expect.any(Object))
    })
  })

  describe('to skip non-directory entries', () => {
    it('when input directory contains files alongside directories', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'dm-sans',
        'README.md',
      ] as never)

      vi.spyOn(fs, 'statSync').mockImplementation(((filePath: string) => {
        if (filePath.includes('dm-sans')) return { isDirectory: () => true }

        return { isDirectory: () => false }
      }) as never)

      generateFontPreviewHtml('/input', '/output')

      expect(generateHtmlForDir).toHaveBeenCalledTimes(1)
    })
  })

  describe('to do nothing', () => {
    it('when no subdirectories are found', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue(['README.md'] as never)

      vi.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false } as never)

      generateFontPreviewHtml('/input', '/output')

      expect(generateHtmlForDir).not.toHaveBeenCalled()
    })
  })

  describe('to handle statSync errors gracefully', () => {
    it('when statSync throws for an entry', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue(['broken-link', 'dm-sans'] as never)

      vi.spyOn(fs, 'statSync').mockImplementation(((filePath: string) => {
        if (filePath.includes('broken-link')) throw new Error('ENOENT')

        return { isDirectory: () => true }
      }) as never)

      generateFontPreviewHtml('/input', '/output')

      expect(generateHtmlForDir).toHaveBeenCalledTimes(1)
      expect(generateHtmlForDir).toHaveBeenCalledWith('/input/dm-sans', '/output/dm-sans', 'dm-sans', expect.any(Object))
    })
  })
})
