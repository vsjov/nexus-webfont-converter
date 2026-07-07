// @vitest-environment node

// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import { URL } from 'node:url'

// External
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Internal
import { convertFontsInDir } from '../convert-fonts-in-dir.js'

// Types
import type { Worker as WorkerType } from 'node:worker_threads'

// Mocks
// -----------------------------------------------------------------------------
const { workerFactory } = vi.hoisted(() => {
  type WorkerEvent =
    | {
        event: 'message'
        value:
          | {
              status: {
                format: 'woff' | 'woff2'
              }
            }
          | {
              result: {
                format: 'woff' | 'woff2'
                success: boolean
                error?: string
              }
            }
          | {
              results: Array<{
                format: 'woff' | 'woff2'
                success: boolean
                error?: string
              }>
            }
      }
    | { event: 'error'; value: Error }
    | { event: 'exit'; value: number }

  const workerFactory = (
    workerEvents: WorkerEvent | WorkerEvent[] = {
      event: 'message',
      value: {
        results: [
          {
            format: 'woff2',
            success: true,
          },
        ],
      },
    },
  ) =>
    function WorkerMock() {
      const handlers: Record<string, (arg: unknown) => void> = {}
      const events = Array.isArray(workerEvents) ? workerEvents : [workerEvents]

      setImmediate(() => {
        for (const workerEvent of events) {
          handlers[workerEvent.event]?.(workerEvent.value)
        }
      })

      return {
        on: (_event: string, handler: (arg: unknown) => void) => {
          handlers[_event] = handler
        },
      } as unknown as WorkerType
    }

  return { workerFactory }
})

vi.mock('node:worker_threads', async importOriginal => {
  const actual = await importOriginal<typeof import('node:worker_threads')>()

  return {
    ...actual,
    Worker: vi.fn().mockImplementation(workerFactory()),
  }
})

// Re-import the mocked module to access the mock constructor
const { Worker } = await import('node:worker_threads')

// Tests
// -----------------------------------------------------------------------------
describe('Expect convertFontsInDir', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(Worker).mockImplementation(workerFactory())
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

      // 2 source fonts = 2 worker invocations, each with both output formats
      expect(Worker).toHaveBeenCalledTimes(2)
      expect(Worker).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({
          workerData: expect.objectContaining({
            outputs: expect.arrayContaining([
              expect.objectContaining({ format: 'woff' }),
              expect.objectContaining({ format: 'woff2' }),
            ]),
          }),
        }),
      )
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
        expect.objectContaining({
          workerData: expect.objectContaining({
            outputs: [expect.objectContaining({ format: 'woff2' })],
          }),
        }),
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
        expect.objectContaining({
          workerData: expect.objectContaining({
            outputs: [expect.objectContaining({ format: 'woff' })],
          }),
        }),
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

  describe('to reuse pre-scanned font files', () => {
    it('when sourceFontFiles option is provided', async () => {
      const readdirSpy = vi.spyOn(fs, 'readdirSync')

      await convertFontsInDir('/fonts/dm-sans', {
        formats: ['woff2'],
        sourceFontFiles: ['DMSans-Regular.ttf'],
      })

      expect(readdirSpy).not.toHaveBeenCalled()
      expect(Worker).toHaveBeenCalledTimes(1)
    })
  })

  describe('to report active worker slot status', () => {
    it('when a worker starts, changes format, and completes', async () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'DMSans-Regular.ttf',
      ] as never)
      const onProgress = vi.fn()
      const onStatus = vi.fn()
      const onWorkerStart = vi.fn()
      const onWorkerStatus = vi.fn()
      const onWorkerDone = vi.fn()

      vi.mocked(Worker).mockImplementation(
        workerFactory([
          {
            event: 'message',
            value: {
              status: {
                format: 'woff',
              },
            },
          },
          {
            event: 'message',
            value: {
              result: {
                format: 'woff',
                success: true,
              },
            },
          },
        ]),
      )

      await convertFontsInDir('/fonts/dm-sans', {
        formats: ['woff'],
        onProgress,
        onStatus,
        onWorkerStart,
        onWorkerStatus,
        onWorkerDone,
      })

      expect(onWorkerStart).toHaveBeenCalledWith(
        0,
        expect.stringContaining('Starting'),
      )
      expect(onStatus).toHaveBeenCalledWith(
        expect.stringContaining('Converting'),
      )
      expect(onWorkerStatus).toHaveBeenCalledWith(
        0,
        expect.stringContaining('Converting'),
      )
      expect(onProgress).toHaveBeenCalledWith(expect.stringContaining('woff'))
      expect(onWorkerDone).toHaveBeenCalledWith(
        0,
        expect.stringContaining('Finished'),
      )
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
            outputs: [
              expect.objectContaining({
                outputPath: expect.stringContaining(
                  'dm-sans-bold-italic.woff2',
                ),
              }),
            ],
          }),
        }),
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
            outputs: [
              expect.objectContaining({
                outputPath: '/output/dm-sans/dm-sans-regular.woff2',
              }),
            ],
          }),
        }),
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

    it('when a directory name has a supported font extension', async () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        {
          name: 'DMSans-Regular.ttf',
          isFile: () => false,
        },
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
      const onWarn = vi.fn()

      vi.mocked(Worker).mockImplementation(
        workerFactory({
          event: 'message',
          value: {
            results: [
              {
                format: 'woff',
                success: false,
                error: 'conversion failed',
              },
            ],
          },
        }),
      )

      await expect(
        convertFontsInDir('/fonts/dm-sans', { formats: ['woff'], onWarn }),
      ).rejects.toThrow('1 font conversion failed.')

      expect(onWarn).toHaveBeenCalledWith(
        expect.stringContaining('conversion failed'),
      )
    })

    it('when a worker exits before sending a result', async () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'DMSans-Regular.ttf',
      ] as never)
      const onWarn = vi.fn()

      vi.mocked(Worker).mockImplementation(
        workerFactory({ event: 'exit', value: 1 }),
      )

      await expect(
        convertFontsInDir('/fonts/dm-sans', { formats: ['woff'], onWarn }),
      ).rejects.toThrow('1 font conversion failed.')

      expect(onWarn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Worker exited before sending a conversion result with code 1',
        ),
      )
    })
  })

  describe('to avoid output collisions', () => {
    it('when multiple source fonts normalize to the same output path', async () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        'Foo-Bold.otf',
        'Foo-Bold.ttf',
      ] as never)
      const onWarn = vi.fn()

      await convertFontsInDir('/fonts/foo', { formats: ['woff2'], onWarn })

      expect(Worker).toHaveBeenCalledTimes(1)
      expect(Worker).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({
          workerData: expect.objectContaining({
            inputPath: '/fonts/foo/Foo-Bold.ttf',
            outputs: [
              expect.objectContaining({
                outputPath: expect.stringContaining('foo-bold.woff2'),
              }),
            ],
          }),
        }),
      )
      expect(onWarn).toHaveBeenCalledWith(
        expect.stringContaining('Foo-Bold.otf'),
      )
    })
  })
})
