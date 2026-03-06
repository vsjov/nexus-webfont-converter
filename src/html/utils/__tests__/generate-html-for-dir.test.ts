// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'

// External
import { afterEach, describe, expect, it, vi } from 'vitest'

// Internal
import { generateHtmlForDir } from '../generate-html-for-dir.js'


// Mocks
// -----------------------------------------------------------------------------
vi.mock('fancy-log', () => ({ default: vi.fn() }))


// Tests
// -----------------------------------------------------------------------------
describe('Expect generateHtmlForDir', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('to generate an HTML preview file', () => {
    it('when font files exist in the source directory', () => {
      vi.spyOn(fs, 'readdirSync').mockImplementation(((dir: string) => {
        if (dir.includes('input')) return ['DMSans-Regular.ttf', 'DMSans-Bold.ttf']
        if (dir.includes('output')) return ['LICENSE.txt']

        return []
      }) as never)

      vi.spyOn(fs, 'existsSync').mockReturnValue(true)

      vi.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => true } as never)
      vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as never)

      let writtenContent = ''

      vi.spyOn(fs, 'writeFileSync').mockImplementation(((
        _path: string,
        content: string,
      ) => {
        writtenContent = content
      }) as never)

      generateHtmlForDir('/input/dm-sans', '/output/dm-sans', 'dm-sans')

      expect(writtenContent).toContain('<!DOCTYPE html>')
      expect(writtenContent).toContain('<title>DM Sans — Font Preview</title>')
      expect(writtenContent).toContain('<h1>DM Sans</h1>')
    })
  })

  describe('to write the file to the correct output path', () => {
    it('when output directory is specified', () => {
      vi.spyOn(fs, 'readdirSync').mockImplementation(((dir: string) => {
        if (dir.includes('input')) return ['DMSans-Regular.ttf']

        return []
      }) as never)

      vi.spyOn(fs, 'existsSync').mockReturnValue(false)
      vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as never)
      vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined)

      generateHtmlForDir('/input/dm-sans', '/output/dm-sans', 'dm-sans')

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/output/dm-sans/dm-sans.html',
        expect.any(String),
        'utf-8'
      )
    })
  })

  describe('to include license file link', () => {
    it('when a .txt license file exists in the output directory', () => {
      vi.spyOn(fs, 'readdirSync').mockImplementation(((dir: string) => {
        if (dir.includes('input')) return ['DMSans-Regular.ttf']
        if (dir.includes('output')) return ['LICENSE.txt']

        return []
      }) as never)

      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => true } as never)
      vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as never)

      let writtenContent = ''

      vi.spyOn(fs, 'writeFileSync').mockImplementation(((
        _path: string,
        content: string,
      ) => {
        writtenContent = content
      }) as never)

      generateHtmlForDir('/input/dm-sans', '/output/dm-sans', 'dm-sans')

      expect(writtenContent).toContain('LICENSE.txt')
      expect(writtenContent).toContain('<footer>')
    })
  })

  describe('to omit the license footer', () => {
    it('when no license file is found', () => {
      vi.spyOn(fs, 'readdirSync').mockImplementation(((dir: string) => {
        if (dir.includes('input')) return ['DMSans-Regular.ttf']

        return []
      }) as never)

      vi.spyOn(fs, 'existsSync').mockReturnValue(false)
      vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as never)

      let writtenContent = ''

      vi.spyOn(fs, 'writeFileSync').mockImplementation(((
        _path: string,
        content: string,
      ) => {
        writtenContent = content
      }) as never)

      generateHtmlForDir('/input/dm-sans', '/output/dm-sans', 'dm-sans')

      expect(writtenContent).not.toContain('<footer>')
    })
  })

  describe('to include extra glyph sections', () => {
    it('when generating the HTML preview', () => {
      vi.spyOn(fs, 'readdirSync').mockImplementation(((dir: string) => {
        if (dir.includes('input')) return ['DMSans-Regular.ttf']

        return []
      }) as never)

      vi.spyOn(fs, 'existsSync').mockReturnValue(false)
      vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as never)

      let writtenContent = ''

      vi.spyOn(fs, 'writeFileSync').mockImplementation(((
        _path: string,
        content: string,
      ) => {
        writtenContent = content
      }) as never)

      generateHtmlForDir('/input/dm-sans', '/output/dm-sans', 'dm-sans')

      expect(writtenContent).toContain('variant__sample--currency')
      expect(writtenContent).toContain('variant__sample--latin1-supplemental')
      expect(writtenContent).toContain('variant__sample--cyrillic')
    })
  })

  describe('to skip HTML generation', () => {
    it('when no font files are found', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue(['README.md'] as never)
      vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined)

      generateHtmlForDir('/input/dm-sans', '/output/dm-sans', 'dm-sans')

      expect(fs.writeFileSync).not.toHaveBeenCalled()
    })
  })

  describe('to create the output directory', () => {
    it('when writing the HTML file', () => {
      vi.spyOn(fs, 'readdirSync').mockImplementation(((dir: string) => {
        if (dir.includes('input')) return ['DMSans-Regular.ttf']

        return []
      }) as never)

      vi.spyOn(fs, 'existsSync').mockReturnValue(false)
      vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as never)
      vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined)

      generateHtmlForDir('/input/dm-sans', '/output/dm-sans', 'dm-sans')

      expect(fs.mkdirSync).toHaveBeenCalledWith('/output/dm-sans', { recursive: true })
    })
  })
})
