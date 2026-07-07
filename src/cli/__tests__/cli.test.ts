// @vitest-environment node

// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import { EventEmitter } from 'node:events'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// External
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Internal
import { isCliEntrypoint, main } from '../cli.js'
import { compileCssFiles } from '../../scss/compile-css.js'
import { regenerateFontPreviewHtml } from '../../html/regenerate-font-preview-html.js'
import { removeUnusedFonts } from '../../file-utils/remove-unused-fonts.js'

// Mocks
// -----------------------------------------------------------------------------
vi.mock('../../scss/compile-css.js', () => ({
  compileCssFiles: vi.fn(() => {
    const stream = new EventEmitter()
    setImmediate(() => stream.emit('end'))

    return stream
  }),
}))

vi.mock('../../html/regenerate-font-preview-html.js', () => ({
  regenerateFontPreviewHtml: vi.fn(),
}))

vi.mock('../../file-utils/remove-unused-fonts.js', () => ({
  removeUnusedFonts: vi.fn(),
}))

vi.mock('../../run-pipeline.js', () => ({
  default: vi.fn(),
}))

// Helpers
// -----------------------------------------------------------------------------
const originalArgv = process.argv

/**
 * Runs the CLI with mocked process arguments.
 *
 * @param args - Arguments passed after the executable and bin path
 * @returns Resolves when the CLI exits through the mocked `process.exit`
 */
const runCli = async (args: string[]): Promise<void> => {
  process.argv = ['node', 'wfc', ...args]

  await main()
}

// Tests
// -----------------------------------------------------------------------------
describe('Expect CLI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(process, 'exit').mockImplementation((code?: string | number) => {
      throw new Error(`process.exit:${String(code)}`)
    })
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    process.argv = originalArgv
    vi.restoreAllMocks()
  })

  describe('to run maintenance mode', () => {
    it('when --compile-css is passed with --out and ignored --in', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'statSync').mockReturnValue({
        isDirectory: () => true,
      } as never)

      await expect(
        runCli([
          '--out',
          '/fonts/web',
          '--in',
          '/fonts/source',
          '--compile-css',
        ]),
      ).rejects.toThrow('process.exit:0')

      expect(process.stderr.write).toHaveBeenCalledWith(
        expect.stringContaining('--in is ignored'),
      )
      expect(compileCssFiles).toHaveBeenCalledWith('/fonts/web')
      expect(regenerateFontPreviewHtml).not.toHaveBeenCalled()
      expect(removeUnusedFonts).not.toHaveBeenCalled()
    })
  })

  describe('to reject invalid conversion arguments', () => {
    it('when input is nested inside output', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'statSync').mockReturnValue({
        isDirectory: () => true,
      } as never)

      await expect(
        runCli(['--in', '/fonts/web/source', '--out', '/fonts/web']),
      ).rejects.toThrow('process.exit:1')

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Input directory cannot be a subfolder of the output directory.',
        ),
      )
    })
  })

  describe('to run conversion mode', () => {
    it('when input and output arguments are valid', async () => {
      const { default: runPipeline } = await import('../../run-pipeline.js')

      vi.spyOn(fs, 'existsSync').mockImplementation((filePath: fs.PathLike) =>
        String(filePath).endsWith('/source'),
      )
      vi.spyOn(fs, 'statSync').mockReturnValue({
        isDirectory: () => true,
      } as never)
      vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as never)

      await runCli(['--in', '/fonts/source', '--out', '/fonts/web'])

      expect(fs.mkdirSync).toHaveBeenCalledWith('/fonts/web', {
        recursive: true,
      })
      expect(runPipeline).toHaveBeenCalledWith('/fonts/source', '/fonts/web')
    })
  })

  describe('to detect entrypoint execution', () => {
    it('when npm bin path is a symlink to the CLI file', () => {
      const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'nexus-wfc-entrypoint-'),
      )
      const realCliPath = path.join(tempDir, 'cli.js')
      const symlinkCliPath = path.join(tempDir, 'wfc')

      try {
        fs.writeFileSync(realCliPath, '')
        fs.symlinkSync(realCliPath, symlinkCliPath)

        expect(
          isCliEntrypoint(symlinkCliPath, pathToFileURL(realCliPath).href),
        ).toBe(true)
      } finally {
        fs.rmSync(tempDir, { force: true, recursive: true })
      }
    })
  })
})
