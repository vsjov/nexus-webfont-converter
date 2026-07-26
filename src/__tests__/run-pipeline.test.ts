// @vitest-environment node

// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import { EventEmitter } from 'node:events'

// External
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Internal
import runPipeline from '../run-pipeline.js'
import { convertFontsInDir } from '../file-utils/convert-fonts-in-dir.js'
import { copyLicenseFiles } from '../file-utils/copy-license-files.js'
import { generateFontFaceScss } from '../scss/generate-font-face-scss.js'
import { compileCssFiles } from '../scss/compile-css.js'
import { generateFontPreviewHtml } from '../html/generate-font-preview-html.js'
import createProgress from '../utils/progress.js'
import { deleteAsync } from 'del'

// Mocks
// -----------------------------------------------------------------------------
const { order } = vi.hoisted(() => ({
  order: [] as string[],
}))

vi.mock('del', () => ({
  deleteAsync: vi.fn(async () => {
    order.push('clean')
  }),
}))

vi.mock('gulp', () => {
  type TaskCallback = (err?: unknown) => void
  type Task = (cb?: TaskCallback) => unknown

  const runTask = async (task: Task): Promise<void> => {
    if (task.length > 0) {
      await new Promise<void>((resolve, reject) => {
        task((err?: unknown) => (err ? reject(err) : resolve()))
      })

      return
    }

    const result = task()

    if (result instanceof Promise) {
      await result
      return
    }

    if (result && typeof (result as EventEmitter).on === 'function') {
      await new Promise<void>((resolve, reject) => {
        ;(result as EventEmitter).on('end', resolve).on('error', reject)
      })
    }
  }

  return {
    default: {
      parallel:
        (...tasks: Task[]) =>
        (cb: TaskCallback) => {
          Promise.all(tasks.map(task => runTask(task))).then(
            () => cb(),
            err => cb(err),
          )
        },
      series:
        (...tasks: Task[]) =>
        (cb: TaskCallback) => {
          tasks
            .reduce(
              (chain, task) => chain.then(() => runTask(task)),
              Promise.resolve(),
            )
            .then(() => cb(), cb)
        },
    },
  }
})

vi.mock('../file-utils/convert-fonts-in-dir.js', () => ({
  convertFontsInDir: vi.fn(async (_inputDir, _options) => {
    order.push('convert')
  }),
}))

vi.mock('../file-utils/copy-license-files.js', () => ({
  copyLicenseFiles: vi.fn((_inputDir, _outputDir, _options) => {
    order.push('copy')
  }),
}))

vi.mock('../scss/generate-font-face-scss.js', () => ({
  generateFontFaceScss: vi.fn(() => {
    order.push('scss')
  }),
}))

vi.mock('../scss/compile-css.js', () => ({
  compileCssFiles: vi.fn(() => {
    order.push('css')
    const stream = new EventEmitter()
    setImmediate(() => stream.emit('end'))

    return stream
  }),
}))

vi.mock('../html/generate-font-preview-html.js', () => ({
  generateFontPreviewHtml: vi.fn(() => {
    order.push('html')
  }),
}))

vi.mock('../utils/progress.js', () => ({
  default: vi.fn(() => ({
    tick: vi.fn(),
    stop: vi.fn(),
  })),
}))

// Helpers
// -----------------------------------------------------------------------------
/**
 * Creates a mock recursive dirent.
 *
 * @param name - Dirent name
 * @param parentPath - Parent path exposed by recursive readdir
 * @param kind - Entry kind
 * @returns Mock recursive dirent
 */
const createDirent = (
  name: string,
  parentPath: string,
  kind: 'file' | 'directory',
): fs.Dirent & { parentPath: string } =>
  ({
    name,
    parentPath,
    isFile: () => kind === 'file',
    isDirectory: () => kind === 'directory',
  }) as fs.Dirent & { parentPath: string }

// Tests
// -----------------------------------------------------------------------------
describe('Expect runPipeline', () => {
  beforeEach(() => {
    order.length = 0
    vi.clearAllMocks()
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.spyOn(fs, 'readdirSync').mockReturnValue([
      createDirent('dm-sans', '/input', 'directory'),
      createDirent('DMSans-Regular.ttf', '/input/dm-sans', 'file'),
      createDirent('OFL.txt', '/input/dm-sans', 'file'),
    ] as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('to run pipeline steps in order', () => {
    it('when conversion succeeds', async () => {
      await runPipeline('/input', '/output')

      expect(order).toEqual(['clean', 'convert', 'copy', 'scss', 'css', 'html'])
      expect(deleteAsync).toHaveBeenCalledWith(
        ['/output/**/*', '!/output/.gitkeep'],
        { force: true, dot: true },
      )
      expect(convertFontsInDir).toHaveBeenCalledWith(
        '/input',
        expect.objectContaining({
          outputDir: '/output',
          sourceFontFiles: ['dm-sans/DMSans-Regular.ttf'],
        }),
      )
      expect(copyLicenseFiles).toHaveBeenCalledWith(
        '/input',
        '/output',
        expect.objectContaining({
          sourceLicenseFiles: ['dm-sans/OFL.txt'],
        }),
      )
      expect(generateFontFaceScss).toHaveBeenCalled()
      expect(compileCssFiles).toHaveBeenCalledWith('/output')
      expect(generateFontPreviewHtml).toHaveBeenCalled()
      expect(process.stdout.write).toHaveBeenCalledWith(
        expect.stringContaining('Saved to:'),
      )
    })
  })

  describe('to aggregate warnings', () => {
    it('when steps report non-fatal warnings', async () => {
      vi.mocked(convertFontsInDir).mockImplementationOnce(
        async (_inputDir, options) => {
          order.push('convert')
          options?.onWarn?.('conversion warning')
        },
      )
      vi.mocked(copyLicenseFiles).mockImplementationOnce(
        (_inputDir, _outputDir, options) => {
          order.push('copy')
          options?.onWarn?.('license warning')
        },
      )

      await runPipeline('/input', '/output')

      expect(process.stderr.write).toHaveBeenCalledWith(
        expect.stringContaining('conversion warning'),
      )
      expect(process.stderr.write).toHaveBeenCalledWith(
        expect.stringContaining('license warning'),
      )
    })
  })

  describe('to reject the pipeline', () => {
    it('when conversion fails', async () => {
      vi.mocked(convertFontsInDir).mockImplementationOnce(
        async (_inputDir, options) => {
          order.push('convert')
          options?.onWarn?.('conversion failed')
          throw new Error('1 font conversion failed.')
        },
      )

      await expect(runPipeline('/input', '/output')).rejects.toThrow(
        '1 font conversion failed.',
      )

      expect(process.stderr.write).toHaveBeenCalledWith(
        expect.stringContaining('conversion failed'),
      )
      expect(generateFontFaceScss).not.toHaveBeenCalled()
      expect(createProgress).toHaveBeenCalledWith(7, expect.any(Number))
    })
  })
})
