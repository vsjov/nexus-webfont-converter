// @vitest-environment node

// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'

// External
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Internal
import { convertFontsInDir } from '../convert-fonts-in-dir.js'


// Mocks
// -----------------------------------------------------------------------------
vi.mock('fancy-log', () => ({ default: vi.fn() }))

const { workerFactory } = vi.hoisted(() => {
  const workerFactory = (message: { success: boolean, error?: string }) => () => {
    const handlers: Record<string, (arg: unknown) => void> = {}

    setImmediate(() => handlers['message']?.(message))

    return {
      on: (_event: string, handler: (arg: unknown) => void) => {
        handlers[_event] = handler
      },
    }
  }

  return { workerFactory }
})

vi.mock('node:worker_threads', async importOriginal => {
  const actual = await importOriginal<typeof import('node:worker_threads')>()

  return {
    ...actual,
    Worker: vi.fn().mockImplementation(workerFactory({ success: true })),
  }
})

// Re-import the mocked module to access the mock constructor
const { Worker } = await import('node:worker_threads')


// Tests
// -----------------------------------------------------------------------------
describe('Expect convertFontsInDir', () => {
  beforeEach(() => {
    vi.mocked(Worker).mockImplementation(workerFactory({ success: true }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('to convert TTF files to both WOFF and WOFF2 by default', () => {
    it('when given a directory with font files', async () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'DMSans-Regular.ttf',
        'DMSans-Bold.ttf',
      ] as never)

      await convertFontsInDir('/fonts/dm-sans')

      // 2 fonts × 2 formats = 4 worker invocations
      expect(Worker).toHaveBeenCalledTimes(4)
    })
  })

  describe('to convert only the requested formats', () => {
    it('when formats option is set to woff2 only', async () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'DMSans-Regular.ttf',
      ] as never)

      await convertFontsInDir('/fonts/dm-sans', { formats: ['woff2'] })

      expect(Worker).toHaveBeenCalledTimes(1)

      expect(Worker).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({ workerData: expect.objectContaining({ format: 'woff2' }) })
      )
    })

    it('when formats option is set to woff only', async () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'DMSans-Regular.ttf',
      ] as never)

      await convertFontsInDir('/fonts/dm-sans', { formats: ['woff'] })

      expect(Worker).toHaveBeenCalledTimes(1)

      expect(Worker).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({ workerData: expect.objectContaining({ format: 'woff' }) })
      )
    })
  })

  describe('to filter only supported font extensions', () => {
    it('when directory contains mixed file types', async () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'DMSans-Regular.ttf',
        'DMSans-Bold.otf',
        'README.md',
        'LICENSE.txt',
      ] as never)

      await convertFontsInDir('/fonts/dm-sans', { formats: ['woff2'] })

      // 2 font files × 1 format = 2 workers
      expect(Worker).toHaveBeenCalledTimes(2)
    })
  })

  describe('to normalize output filenames', () => {
    it('when converting a PascalCase font name', async () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'DMSans-BoldItalic.ttf',
      ] as never)

      await convertFontsInDir('/fonts/dm-sans', { formats: ['woff2'] })

      expect(Worker).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({
          workerData: expect.objectContaining({
            outputPath: expect.stringContaining('dm-sans-bold-italic.woff2'),
          }),
        })
      )
    })
  })

  describe('to place output in custom outputDir', () => {
    it('when outputDir option is provided', async () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'DMSans-Regular.ttf',
      ] as never)

      await convertFontsInDir('/fonts/dm-sans', {
        outputDir: '/output/dm-sans',
        formats: ['woff2'],
      })

      expect(Worker).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({
          workerData: expect.objectContaining({
            inputPath: '/fonts/dm-sans/DMSans-Regular.ttf',
            outputPath: '/output/dm-sans/dm-sans-regular.woff2',
          }),
        })
      )
    })
  })

  describe('to skip conversion', () => {
    it('when no font files are found in the directory', async () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'README.md',
        'LICENSE.txt',
      ] as never)

      await convertFontsInDir('/fonts/empty')

      expect(Worker).not.toHaveBeenCalled()
    })
  })

  describe('to handle conversion errors gracefully', () => {
    it('when a worker reports a conversion failure', async () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'DMSans-Regular.ttf',
      ] as never)

      vi.mocked(Worker).mockImplementation(workerFactory({ success: false, error: 'conversion failed' }))

      await expect(convertFontsInDir('/fonts/dm-sans', { formats: ['woff'] })).resolves.toBeUndefined()
    })
  })
})
