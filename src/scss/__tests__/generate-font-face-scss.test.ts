// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'

// External
import { afterEach, describe, expect, it, vi } from 'vitest'

// Internal
import { generateFontFaceScss } from '../generate-font-face-scss.js'


// Mocks
// -----------------------------------------------------------------------------

vi.mock('../utils/generate-scss-for-dir.js', () => ({
  generateScssForDir: vi.fn(),
}))

const { generateScssForDir } = await import('../utils/generate-scss-for-dir.js')


// Tests
// -----------------------------------------------------------------------------
describe('Expect generateFontFaceScss', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('to call generateScssForDir for each font subdirectory', () => {
    it('when input directory contains font subdirectories', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue(['dm-sans', 'roboto'] as never)

      vi.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => true } as never)

      generateFontFaceScss('/input', '/output')

      expect(generateScssForDir).toHaveBeenCalledTimes(2)
      expect(generateScssForDir).toHaveBeenCalledWith('/input/dm-sans', '/output/dm-sans', 'dm-sans', expect.any(Object))
      expect(generateScssForDir).toHaveBeenCalledWith('/input/roboto', '/output/roboto', 'roboto', expect.any(Object))
    })
  })

  describe('to skip non-directory entries', () => {
    it('when input directory contains files alongside directories', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'dm-sans',
        'README.md',
        '.gitkeep',
      ] as never)

      vi.spyOn(fs, 'statSync').mockImplementation(((filePath: string) => {
        if (filePath.includes('dm-sans')) return { isDirectory: () => true }

        return { isDirectory: () => false }
      }) as never)

      generateFontFaceScss('/input', '/output')

      expect(generateScssForDir).toHaveBeenCalledTimes(1)
      expect(generateScssForDir).toHaveBeenCalledWith('/input/dm-sans', '/output/dm-sans', 'dm-sans', expect.any(Object))
    })
  })

  describe('to do nothing', () => {
    it('when no subdirectories are found', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue(['README.md'] as never)

      vi.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false } as never)

      generateFontFaceScss('/input', '/output')

      expect(generateScssForDir).not.toHaveBeenCalled()
    })
  })

  describe('to handle statSync errors gracefully', () => {
    it('when statSync throws for an entry', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue(['broken-link', 'dm-sans'] as never)

      vi.spyOn(fs, 'statSync').mockImplementation(((filePath: string) => {
        if (filePath.includes('broken-link')) throw new Error('ENOENT')

        return { isDirectory: () => true }
      }) as never)

      generateFontFaceScss('/input', '/output')

      expect(generateScssForDir).toHaveBeenCalledTimes(1)
      expect(generateScssForDir).toHaveBeenCalledWith('/input/dm-sans', '/output/dm-sans', 'dm-sans', expect.any(Object))
    })
  })
})
