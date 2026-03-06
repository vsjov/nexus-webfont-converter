// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Worker } from 'node:worker_threads'

// External
import log from 'fancy-log'
import pc from 'picocolors'

// Internal
import { SOURCE_EXTENSIONS } from '../config/constants.js'
import { toHyphenated } from '../utils/to-hyphenated.js'


// Types
// -----------------------------------------------------------------------------
export type FontConversionFormat = 'woff' | 'woff2'

export type ConvertFontsInDirOptions = {
  outputDir?: string,
  formats?: FontConversionFormat[],
}

type ConversionTask = {
  inputPath: string,
  outputPath: string,
  format: FontConversionFormat,
  sourceName: string,
  normalizedBase: string,
}


// Helpers
// -----------------------------------------------------------------------------
const runTask = (task: ConversionTask): Promise<void> =>
  new Promise(resolve => {
    const worker = new Worker(
      new URL('./utils/font-conversion-worker.js', import.meta.url),
      { workerData: { inputPath: task.inputPath, outputPath: task.outputPath, format: task.format } }
    )

    worker.on('message', (msg: { success: boolean, error?: string }) => {
      if (msg.success) {
        log(`Generated ${pc.green(`${task.normalizedBase}.${task.format}`)} from ${pc.blue(task.sourceName)}`)
      } else {
        log(pc.red(`Failed to convert ${pc.blue(task.sourceName)} to ${task.format.toUpperCase()}: ${msg.error}`))
      }

      resolve()
    })

    worker.on('error', (err: Error) => {
      log(pc.red(`Worker error for ${pc.blue(task.sourceName)}: ${err.message}`))
      resolve()
    })
  })

const runWithPool = async (tasks: ConversionTask[], concurrency: number): Promise<void> => {
  const queue = [...tasks]

  const runLoop = async (): Promise<void> => {
    while (queue.length > 0) {
      const task = queue.shift()
      if (task) await runTask(task)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, runLoop))
}


// Function
// -----------------------------------------------------------------------------
/**
 * Recursively scans `dirPath` for all `*.ttf` and `*.otf` files and converts
 * them to the requested web font formats using a pool of worker threads for
 * true CPU parallelism. Each output file is placed alongside the source file
 * by default, or inside `options.outputDir` when provided (preserving the
 * relative sub-directory structure).
 *
 * @param dirPath - Directory to scan for source font files
 * @param options - Optional configuration
 * @param options.outputDir - Override destination directory (default: same as source file)
 * @param options.formats - Which formats to produce (default: `['woff', 'woff2']`)
 *
 * @example
 * ```ts
 * convertFontsInDir('./assets/roboto', { formats: ['woff2'] })
 * ```
 */
export const convertFontsInDir = async (
  dirPath: string,
  options: ConvertFontsInDirOptions = {}
): Promise<void> => {
  const {
    outputDir,
    formats = ['woff', 'woff2'],
  } = options

  const allEntries = fs.readdirSync(dirPath, { recursive: true, encoding: 'utf-8' })

  const fontFiles = allEntries.filter(entry =>
    SOURCE_EXTENSIONS.includes(path.extname(entry).toLowerCase())
  )

  if (fontFiles.length === 0) {
    log(pc.yellow(`No TTF or OTF files found in ${pc.blue(dirPath)}`))

    return
  }

  const tasks: ConversionTask[] = fontFiles.flatMap(relPath => {
    const inputPath = path.join(dirPath, relPath)

    const resolvedOutputDir = outputDir
      ? path.join(outputDir, path.dirname(relPath))
      : path.dirname(inputPath)

    const normalizedBase = toHyphenated(path.basename(relPath, path.extname(relPath)))
    const sourceName = path.basename(relPath)

    return formats.map(format => ({
      inputPath,
      outputPath: path.join(resolvedOutputDir, `${normalizedBase}.${format}`),
      format,
      sourceName,
      normalizedBase,
    }))
  })

  await runWithPool(tasks, os.cpus().length)
}

export default convertFontsInDir
