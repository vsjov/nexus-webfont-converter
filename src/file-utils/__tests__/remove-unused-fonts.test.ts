// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import path from 'node:path'

// External
import { afterEach, describe, expect, it, vi } from 'vitest'

// Internal
import { removeUnusedFonts } from '../remove-unused-fonts.js'


// Mocks
// -----------------------------------------------------------------------------
vi.mock('fancy-log', () => ({ default: vi.fn() }))

vi.mock('../../html/utils/parse-scss-entries.js', () => ({
  parseScssEntries: vi.fn(),
}))

const { parseScssEntries } = await import('../../html/utils/parse-scss-entries.js')


// Tests
// -----------------------------------------------------------------------------
describe('Expect removeUnusedFonts', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('to delete font files not referenced in the SCSS', () => {
    it('when a woff2 file has no matching @include', () => {
      vi.spyOn(fs, 'readdirSync').mockImplementation(((dirPath: string) => {
        if (String(dirPath).endsWith('dm-sans')) {
          return ['dm-sans-regular.woff2', 'dm-sans-medium.woff2', 'dm-sans.scss'] as never
        }

        return ['dm-sans'] as never
      }) as never)

      vi.spyOn(fs, 'statSync').mockImplementation(((filePath: string) => ({
        isDirectory: () => String(filePath).endsWith('dm-sans'),
        isFile: () => !String(filePath).endsWith('dm-sans'),
      })) as never)

      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'readFileSync').mockReturnValue('scss content' as never)
      const unlinkSpy = vi.spyOn(fs, 'unlinkSync').mockImplementation(() => undefined)

      vi.mocked(parseScssEntries).mockReturnValue([
        { normalizedBase: 'dm-sans-regular', weight: 400, style: 'normal' },
      ])

      removeUnusedFonts('/output')

      expect(unlinkSpy).toHaveBeenCalledTimes(1)
      expect(unlinkSpy).toHaveBeenCalledWith(path.join('/output', 'dm-sans', 'dm-sans-medium.woff2'))
    })

    it('when both woff and woff2 variants of the same unused font exist', () => {
      vi.spyOn(fs, 'readdirSync').mockImplementation(((dirPath: string) => {
        if (String(dirPath).endsWith('dm-sans')) {
          return [
            'dm-sans-regular.woff',
            'dm-sans-regular.woff2',
            'dm-sans-medium.woff',
            'dm-sans-medium.woff2',
            'dm-sans.scss',
          ] as never
        }

        return ['dm-sans'] as never
      }) as never)

      vi.spyOn(fs, 'statSync').mockImplementation(((filePath: string) => ({
        isDirectory: () => String(filePath).endsWith('dm-sans'),
      })) as never)

      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'readFileSync').mockReturnValue('scss content' as never)
      const unlinkSpy = vi.spyOn(fs, 'unlinkSync').mockImplementation(() => undefined)

      vi.mocked(parseScssEntries).mockReturnValue([
        { normalizedBase: 'dm-sans-regular', weight: 400, style: 'normal' },
      ])

      removeUnusedFonts('/output')

      expect(unlinkSpy).toHaveBeenCalledTimes(2)
      expect(unlinkSpy).toHaveBeenCalledWith(path.join('/output', 'dm-sans', 'dm-sans-medium.woff'))
      expect(unlinkSpy).toHaveBeenCalledWith(path.join('/output', 'dm-sans', 'dm-sans-medium.woff2'))
    })
  })

  describe('to keep font files that are still referenced', () => {
    it('when all font files are in the SCSS', () => {
      vi.spyOn(fs, 'readdirSync').mockImplementation(((dirPath: string) => {
        if (String(dirPath).endsWith('dm-sans')) {
          return ['dm-sans-regular.woff2', 'dm-sans-bold.woff2', 'dm-sans.scss'] as never
        }

        return ['dm-sans'] as never
      }) as never)

      vi.spyOn(fs, 'statSync').mockImplementation(((filePath: string) => ({
        isDirectory: () => String(filePath).endsWith('dm-sans'),
      })) as never)

      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'readFileSync').mockReturnValue('scss content' as never)
      const unlinkSpy = vi.spyOn(fs, 'unlinkSync').mockImplementation(() => undefined)

      vi.mocked(parseScssEntries).mockReturnValue([
        { normalizedBase: 'dm-sans-regular', weight: 400, style: 'normal' },
        { normalizedBase: 'dm-sans-bold', weight: 700, style: 'normal' },
      ])

      removeUnusedFonts('/output')

      expect(unlinkSpy).not.toHaveBeenCalled()
    })
  })

  describe('to skip non-font files', () => {
    it('when the directory contains SCSS, CSS, and HTML files alongside fonts', () => {
      vi.spyOn(fs, 'readdirSync').mockImplementation(((dirPath: string) => {
        if (String(dirPath).endsWith('dm-sans')) {
          return [
            'dm-sans-regular.woff2',
            'dm-sans-medium.woff2',
            'dm-sans.scss',
            'dm-sans.css',
            'dm-sans.html',
          ] as never
        }

        return ['dm-sans'] as never
      }) as never)

      vi.spyOn(fs, 'statSync').mockImplementation(((filePath: string) => ({
        isDirectory: () => String(filePath).endsWith('dm-sans'),
      })) as never)

      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'readFileSync').mockReturnValue('scss content' as never)
      const unlinkSpy = vi.spyOn(fs, 'unlinkSync').mockImplementation(() => undefined)

      vi.mocked(parseScssEntries).mockReturnValue([
        { normalizedBase: 'dm-sans-regular', weight: 400, style: 'normal' },
      ])

      removeUnusedFonts('/output')

      // Only dm-sans-medium.woff2 should be deleted - not scss/css/html
      expect(unlinkSpy).toHaveBeenCalledTimes(1)
      expect(unlinkSpy).toHaveBeenCalledWith(path.join('/output', 'dm-sans', 'dm-sans-medium.woff2'))
    })
  })

  describe('to skip dirs without a SCSS file', () => {
    it('when the SCSS file does not exist', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue(['dm-sans'] as never)

      vi.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => true } as never)
      vi.spyOn(fs, 'existsSync').mockReturnValue(false)

      removeUnusedFonts('/output')

      expect(parseScssEntries).not.toHaveBeenCalled()
    })
  })

  describe('to do nothing', () => {
    it('when output directory has no subdirectories', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue(['README.md'] as never)
      vi.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false } as never)

      removeUnusedFonts('/output')

      expect(parseScssEntries).not.toHaveBeenCalled()
    })
  })

  describe('to handle statSync errors gracefully', () => {
    it('when statSync throws for an entry', () => {
      vi.spyOn(fs, 'readdirSync').mockImplementation(((dirPath: string) => {
        if (String(dirPath).includes('dm-sans')) {
          return ['dm-sans-regular.woff2', 'dm-sans.scss'] as never
        }

        return ['broken-link', 'dm-sans'] as never
      }) as never)

      vi.spyOn(fs, 'statSync').mockImplementation(((filePath: string) => {
        if (String(filePath).includes('broken-link')) throw new Error('ENOENT')

        return { isDirectory: () => String(filePath).endsWith('dm-sans') }
      }) as never)

      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'readFileSync').mockReturnValue('scss content' as never)
      vi.spyOn(fs, 'unlinkSync').mockImplementation(() => undefined)

      vi.mocked(parseScssEntries).mockReturnValue([
        { normalizedBase: 'dm-sans-regular', weight: 400, style: 'normal' },
      ])

      removeUnusedFonts('/output')

      expect(parseScssEntries).toHaveBeenCalledTimes(1)
    })
  })
})
