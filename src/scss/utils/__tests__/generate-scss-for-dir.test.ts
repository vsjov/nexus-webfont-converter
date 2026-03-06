// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'

// External
import { afterEach, describe, expect, it, vi } from 'vitest'

// Internal
import { generateScssForDir } from '../generate-scss-for-dir.js'


// Mocks
// -----------------------------------------------------------------------------


// Tests
// -----------------------------------------------------------------------------
describe('Expect generateScssForDir', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('to generate an SCSS file with @font-face includes', () => {
    it('when font files and converted output exist', () => {
      // Source directory has TTF files
      vi.spyOn(fs, 'readdirSync').mockImplementation(((dir: string) => {
        if (dir.includes('input')) return ['DMSans-Regular.ttf', 'DMSans-Bold.ttf']
        if (dir.includes('output')) return ['dm-sans-regular.woff2', 'dm-sans-bold.woff2']

        return []
      }) as never)

      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as never)

      let writtenContent = ''

      vi.spyOn(fs, 'writeFileSync').mockImplementation(((
        _path: string,
        content: string,
      ) => {
        writtenContent = content
      }) as never)

      generateScssForDir('/input/dm-sans', '/output/dm-sans', 'dm-sans')

      expect(writtenContent).toContain('@mixin fontFace')
      expect(writtenContent).toContain('@include fontFace("DM Sans"')
      expect(writtenContent).toContain('format("woff2")')
    })
  })

  describe('to include the correct number of @include statements', () => {
    it('when multiple font variants exist', () => {
      vi.spyOn(fs, 'readdirSync').mockImplementation(((dir: string) => {
        if (dir.includes('input')) {
          return [
            'DMSans-Regular.ttf',
            'DMSans-Italic.ttf',
            'DMSans-Bold.ttf',
          ]
        }

        if (dir.includes('output')) return ['dm-sans-regular.woff2']

        return []
      }) as never)

      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as never)

      let writtenContent = ''

      vi.spyOn(fs, 'writeFileSync').mockImplementation(((
        _path: string,
        content: string,
      ) => {
        writtenContent = content
      }) as never)

      generateScssForDir('/input/dm-sans', '/output/dm-sans', 'dm-sans')

      const includeCount = (writtenContent.match(/@include fontFace/g) ?? []).length

      expect(includeCount).toBe(3)
    })
  })

  describe('to include variant comments', () => {
    it('when generating includes for different weights', () => {
      vi.spyOn(fs, 'readdirSync').mockImplementation(((dir: string) => {
        if (dir.includes('input')) return ['DMSans-Regular.ttf', 'DMSans-Bold.ttf']
        if (dir.includes('output')) return ['dm-sans-regular.woff2']

        return []
      }) as never)

      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as never)

      let writtenContent = ''

      vi.spyOn(fs, 'writeFileSync').mockImplementation(((
        _path: string,
        content: string,
      ) => {
        writtenContent = content
      }) as never)

      generateScssForDir('/input/dm-sans', '/output/dm-sans', 'dm-sans')

      expect(writtenContent).toContain('// Normal')
      expect(writtenContent).toContain('// Bold')
    })
  })

  describe('to detect multiple output formats', () => {
    it('when both woff2 and woff files exist in output', () => {
      vi.spyOn(fs, 'readdirSync').mockImplementation(((dir: string) => {
        if (dir.includes('input')) return ['DMSans-Regular.ttf']
        if (dir.includes('output')) return ['dm-sans-regular.woff2', 'dm-sans-regular.woff']

        return []
      }) as never)

      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as never)

      let writtenContent = ''

      vi.spyOn(fs, 'writeFileSync').mockImplementation(((
        _path: string,
        content: string,
      ) => {
        writtenContent = content
      }) as never)

      generateScssForDir('/input/dm-sans', '/output/dm-sans', 'dm-sans')

      expect(writtenContent).toContain('format("woff2")')
      expect(writtenContent).toContain('format("woff")')
    })
  })

  describe('to write the file to the correct path', () => {
    it('when output directory is specified', () => {
      vi.spyOn(fs, 'readdirSync').mockImplementation(((dir: string) => {
        if (dir.includes('input')) return ['DMSans-Regular.ttf']
        if (dir.includes('output')) return ['dm-sans-regular.woff2']

        return []
      }) as never)

      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as never)
      vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined)

      generateScssForDir('/input/dm-sans', '/output/dm-sans', 'dm-sans')

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/output/dm-sans/dm-sans.scss',
        expect.any(String),
        'utf-8'
      )
    })
  })

  describe('to skip generation', () => {
    it('when no font files are found in the source directory', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue(['README.md'] as never)
      vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined)

      generateScssForDir('/input/dm-sans', '/output/dm-sans', 'dm-sans')

      expect(fs.writeFileSync).not.toHaveBeenCalled()
    })

    it('when no converted font files are found in the output directory', () => {
      vi.spyOn(fs, 'readdirSync').mockImplementation(((dir: string) => {
        if (dir.includes('input')) return ['DMSans-Regular.ttf']
        if (dir.includes('output')) return []

        return []
      }) as never)

      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined)

      generateScssForDir('/input/dm-sans', '/output/dm-sans', 'dm-sans')

      expect(fs.writeFileSync).not.toHaveBeenCalled()
    })

    it('when output directory does not exist', () => {
      vi.spyOn(fs, 'readdirSync').mockImplementation(((dir: string) => {
        if (dir.includes('input')) return ['DMSans-Regular.ttf']

        return []
      }) as never)

      vi.spyOn(fs, 'existsSync').mockReturnValue(false)
      vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined)

      generateScssForDir('/input/dm-sans', '/output/dm-sans', 'dm-sans')

      expect(fs.writeFileSync).not.toHaveBeenCalled()
    })
  })
})
