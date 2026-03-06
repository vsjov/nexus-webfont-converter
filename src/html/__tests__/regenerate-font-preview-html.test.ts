// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import path from 'node:path'

// External
import { afterEach, describe, expect, it, vi } from 'vitest'

// Internal
import { regenerateFontPreviewHtml } from '../regenerate-font-preview-html.js'


// Mocks
// -----------------------------------------------------------------------------
vi.mock('fancy-log', () => ({ default: vi.fn() }))

vi.mock('../utils/parse-scss-entries.js', () => ({
  parseScssEntries: vi.fn(),
}))

vi.mock('../utils/template-html-samples.js', () => ({
  templateHtmlSamples: vi.fn(() => '<html></html>'),
}))

const { parseScssEntries } = await import('../utils/parse-scss-entries.js')
const { templateHtmlSamples } = await import('../utils/template-html-samples.js')


// Helpers
// -----------------------------------------------------------------------------
const mockFontDirs = (dirs: string[], filesPerDir: Record<string, string[]> = {}) => {
  vi.spyOn(fs, 'readdirSync').mockImplementation(((dirPath: string) => {
    const dirStr = String(dirPath)

    for (const [dir, files] of Object.entries(filesPerDir)) {
      if (dirStr.endsWith(dir)) return files as never
    }

    return dirs as never
  }) as never)

  vi.spyOn(fs, 'statSync').mockImplementation(((filePath: string) => {
    const p = String(filePath)

    // Files inside a font dir (not the font dirs themselves)
    if (Object.values(filesPerDir).flat().some(f => p.endsWith(f))) {
      return { isDirectory: () => false, isFile: () => true }
    }

    return { isDirectory: () => true, isFile: () => false }
  }) as never)
}


// Tests
// -----------------------------------------------------------------------------
describe('Expect regenerateFontPreviewHtml', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('to regenerate HTML for each font subdirectory', () => {
    it('when output directory contains font dirs with SCSS files', () => {
      mockFontDirs(['dm-sans'])

      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'readFileSync').mockReturnValue('@include fontFace("DM Sans", "dm-sans-regular", 400, "normal");' as never)
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined)

      vi.mocked(parseScssEntries).mockReturnValue([
        { normalizedBase: 'dm-sans-regular', weight: 400, style: 'normal' },
      ])

      regenerateFontPreviewHtml('/output')

      expect(parseScssEntries).toHaveBeenCalledTimes(1)
      expect(templateHtmlSamples).toHaveBeenCalledTimes(1)

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join('/output', 'dm-sans', 'dm-sans.html'),
        '<html></html>',
        'utf-8'
      )
    })
  })

  describe('to skip font dirs without a SCSS file', () => {
    it('when the SCSS file does not exist', () => {
      mockFontDirs(['dm-sans'])

      vi.spyOn(fs, 'existsSync').mockReturnValue(false)

      regenerateFontPreviewHtml('/output')

      expect(parseScssEntries).not.toHaveBeenCalled()
      expect(templateHtmlSamples).not.toHaveBeenCalled()
    })
  })

  describe('to skip font dirs where SCSS has no includes', () => {
    it('when parseScssEntries returns an empty array', () => {
      mockFontDirs(['dm-sans'])

      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'readFileSync').mockReturnValue('// empty' as never)
      vi.mocked(parseScssEntries).mockReturnValue([])

      regenerateFontPreviewHtml('/output')

      expect(templateHtmlSamples).not.toHaveBeenCalled()
    })
  })

  describe('to do nothing', () => {
    it('when output directory has no subdirectories', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue(['README.md'] as never)
      vi.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false, isFile: () => true } as never)

      regenerateFontPreviewHtml('/output')

      expect(parseScssEntries).not.toHaveBeenCalled()
    })
  })

  describe('to handle statSync errors gracefully', () => {
    it('when statSync throws for an entry', () => {
      vi.spyOn(fs, 'readdirSync').mockImplementation(((dirPath: string) => {
        // When scanning inside the dm-sans dir for license files, return empty
        if (String(dirPath).includes('dm-sans')) return [] as never

        return ['broken-link', 'dm-sans'] as never
      }) as never)

      vi.spyOn(fs, 'statSync').mockImplementation(((filePath: string) => {
        if (String(filePath).includes('broken-link')) throw new Error('ENOENT')

        return { isDirectory: () => true, isFile: () => false }
      }) as never)

      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'readFileSync').mockReturnValue('@include fontFace("DM Sans", "dm-sans-regular", 400, "normal");' as never)
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined)

      vi.mocked(parseScssEntries).mockReturnValue([
        { normalizedBase: 'dm-sans-regular', weight: 400, style: 'normal' },
      ])

      regenerateFontPreviewHtml('/output')

      expect(parseScssEntries).toHaveBeenCalledTimes(1)
    })
  })
})
