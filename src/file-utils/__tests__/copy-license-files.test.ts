// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'

// External
import { afterEach, describe, expect, it, vi } from 'vitest'

// Internal
import { copyLicenseFiles } from '../copy-license-files.js'


// Mocks
// -----------------------------------------------------------------------------
vi.mock('fancy-log', () => ({ default: vi.fn() }))


// Tests
// -----------------------------------------------------------------------------
describe('Expect copyLicenseFiles', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('to copy .txt files from input to output directory', () => {
    it('when license .txt files exist', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'dm-sans/LICENSE.txt',
      ] as never)

      vi.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => true } as never)
      vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as never)
      vi.spyOn(fs, 'copyFileSync').mockReturnValue(undefined)

      copyLicenseFiles('/input', '/output')

      expect(fs.copyFileSync).toHaveBeenCalledWith(
        '/input/dm-sans/LICENSE.txt',
        '/output/dm-sans/LICENSE.txt'
      )
    })
  })

  describe('to copy files with no extension', () => {
    it('when extensionless license files exist', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'dm-sans/LICENSE',
      ] as never)

      vi.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => true } as never)
      vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as never)
      vi.spyOn(fs, 'copyFileSync').mockReturnValue(undefined)

      copyLicenseFiles('/input', '/output')

      expect(fs.copyFileSync).toHaveBeenCalledWith(
        '/input/dm-sans/LICENSE',
        '/output/dm-sans/LICENSE'
      )
    })
  })

  describe('to skip .gitkeep files', () => {
    it('when .gitkeep is present in the directory', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        '.gitkeep',
        'dm-sans/LICENSE.txt',
      ] as never)

      vi.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => true } as never)
      vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as never)
      vi.spyOn(fs, 'copyFileSync').mockReturnValue(undefined)

      copyLicenseFiles('/input', '/output')

      expect(fs.copyFileSync).toHaveBeenCalledTimes(1)

      expect(fs.copyFileSync).toHaveBeenCalledWith(
        '/input/dm-sans/LICENSE.txt',
        '/output/dm-sans/LICENSE.txt'
      )
    })
  })

  describe('to skip non-.txt file extensions', () => {
    it('when directory contains fonts and other files', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'dm-sans/DMSans-Regular.ttf',
        'dm-sans/DMSans-Bold.otf',
        'dm-sans/preview.html',
        'dm-sans/LICENSE.txt',
      ] as never)

      vi.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => true } as never)
      vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as never)
      vi.spyOn(fs, 'copyFileSync').mockReturnValue(undefined)

      copyLicenseFiles('/input', '/output')

      expect(fs.copyFileSync).toHaveBeenCalledTimes(1)
    })
  })

  describe('to skip directories', () => {
    it('when an entry is a directory, not a file', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'sub-dir',
      ] as never)

      vi.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => false } as never)
      vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as never)
      vi.spyOn(fs, 'copyFileSync').mockReturnValue(undefined)

      copyLicenseFiles('/input', '/output')

      expect(fs.copyFileSync).not.toHaveBeenCalled()
    })
  })

  describe('to create the output directory recursively', () => {
    it('when the output subdirectory does not exist', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'dm-sans/LICENSE.txt',
      ] as never)

      vi.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => true } as never)
      vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as never)
      vi.spyOn(fs, 'copyFileSync').mockReturnValue(undefined)

      copyLicenseFiles('/input', '/output')

      expect(fs.mkdirSync).toHaveBeenCalledWith('/output/dm-sans', { recursive: true })
    })
  })

  describe('to do nothing', () => {
    it('when no license files are found', () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'dm-sans/DMSans-Regular.ttf',
      ] as never)

      vi.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => true } as never)
      vi.spyOn(fs, 'copyFileSync').mockReturnValue(undefined)

      copyLicenseFiles('/input', '/output')

      expect(fs.copyFileSync).not.toHaveBeenCalled()
    })
  })
})
