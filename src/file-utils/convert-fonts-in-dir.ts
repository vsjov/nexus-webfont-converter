// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Worker } from 'node:worker_threads'
import { URL } from 'node:url'

// External
import pc from 'picocolors'

// Internal
import { SOURCE_EXTENSIONS } from '../config/constants.js'
import { toHyphenated } from '../utils/to-hyphenated.js'

// Types
import type { OutputFormat } from '../config/constants.js'
import type { ProgressOptions } from '../utils/progress.js'

// Types
// -----------------------------------------------------------------------------
export type ConvertFontsInDirOptions = ProgressOptions & {
  outputDir?: string
  formats?: OutputFormat[]
}

type ConversionTask = {
  inputPath: string
  outputPath: string
  format: OutputFormat
  sourceName: string
  normalizedBase: string
  onProgress?: (label: string) => void
  onWarn?: (message: string) => void
}

type ConversionTaskResult = {
  success: boolean
  error?: string
}

type RecursiveDirent = fs.Dirent & {
  parentPath?: string
  path?: string
}

type RecursiveEntry = string | RecursiveDirent

// Helpers
// -----------------------------------------------------------------------------
/**
 * Converts a recursive dirent into a path relative to the scanned root.
 *
 * @param rootDir - Directory passed to `readdirSync`
 * @param entry - Dirent returned from recursive `readdirSync`
 * @returns Relative path for the entry
 */
const getRelativeDirentPath = (
  rootDir: string,
  entry: RecursiveDirent,
): string => {
  const parentPath = entry.parentPath ?? entry.path ?? rootDir

  return path.relative(rootDir, path.join(parentPath, entry.name))
}

/**
 * Checks whether a recursive directory entry is a supported source font file.
 *
 * @param entry - Recursive directory entry to inspect
 * @returns `true` when the entry is a source font file
 */
const isSourceFontEntry = (entry: RecursiveEntry): boolean => {
  if (typeof entry === 'string') {
    return SOURCE_EXTENSIONS.includes(path.extname(entry).toLowerCase())
  }

  return (
    entry.isFile() &&
    SOURCE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())
  )
}

/**
 * Converts a recursive directory entry into a relative path.
 *
 * @param rootDir - Directory passed to `readdirSync`
 * @param entry - Recursive directory entry to convert
 * @returns Relative source font path
 */
const getRelativeEntryPath = (rootDir: string, entry: RecursiveEntry): string =>
  typeof entry === 'string' ? entry : getRelativeDirentPath(rootDir, entry)

/**
 * Finds source font files under a directory.
 *
 * @param dirPath - Directory to scan recursively
 * @returns Relative source font paths
 */
const findSourceFontFiles = (dirPath: string): string[] =>
  (
    fs.readdirSync(dirPath, {
      recursive: true,
      withFileTypes: true,
    }) as RecursiveEntry[]
  )
    .filter(isSourceFontEntry)
    .map(entry => getRelativeEntryPath(dirPath, entry))

/**
 * Converts one source font to one output format in a worker thread.
 *
 * @param task - Conversion task metadata and callbacks
 * @returns Worker conversion result
 */
const runTask = (task: ConversionTask): Promise<ConversionTaskResult> =>
  new Promise(resolve => {
    let isSettled = false
    const worker = new Worker(
      new URL('./utils/font-conversion-worker.js', import.meta.url),
      {
        workerData: {
          inputPath: task.inputPath,
          outputPath: task.outputPath,
          format: task.format,
        },
      },
    )

    const settle = (result: ConversionTaskResult) => {
      if (isSettled) return

      isSettled = true

      if (result.success) {
        task.onProgress?.(
          `Generated ${pc.green(`${task.normalizedBase}.${task.format}`)} from ${pc.blue(task.sourceName)}`,
        )
      } else {
        task.onWarn?.(
          `Failed to convert ${pc.blue(task.sourceName)} to ${task.format.toUpperCase()}: ${result.error}`,
        )
      }

      resolve(result)
    }

    worker.on('message', (msg: { success: boolean; error?: string }) => {
      settle(msg)
    })

    worker.on('error', (err: Error) => {
      settle({ success: false, error: `Worker error: ${err.message}` })
    })

    worker.on('exit', (code: number) => {
      if (isSettled) return

      settle({
        success: false,
        error: `Worker exited before sending a conversion result with code ${code}`,
      })
    })
  })

/**
 * Runs conversion tasks with bounded concurrency.
 *
 * @param tasks - Conversion tasks to process
 * @param concurrency - Maximum number of concurrent worker tasks
 * @returns Conversion results in completion order
 */
const runWithPool = async (
  tasks: ConversionTask[],
  concurrency: number,
): Promise<ConversionTaskResult[]> => {
  const queue = [...tasks]
  const results: ConversionTaskResult[] = []

  const runLoop = async (): Promise<void> => {
    while (queue.length > 0) {
      const task = queue.shift()
      if (task) results.push(await runTask(task))
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, runLoop),
  )

  return results
}

/**
 * Chooses a deterministic source when several tasks would write the same
 * output file.
 *
 * @param tasks - Tasks that target the same output path
 * @returns Preferred task to keep
 */
const selectPreferredTask = (tasks: ConversionTask[]): ConversionTask => {
  return [...tasks].sort((a, b) => {
    const extA = path.extname(a.inputPath).toLowerCase()
    const extB = path.extname(b.inputPath).toLowerCase()
    const rankA = extA === '.ttf' ? 0 : 1
    const rankB = extB === '.ttf' ? 0 : 1

    if (rankA !== rankB) return rankA - rankB

    return a.sourceName.localeCompare(b.sourceName)
  })[0]
}

/**
 * Removes tasks that would write to the same output path.
 *
 * @param tasks - Candidate conversion tasks
 * @param onWarn - Optional warning callback for skipped duplicate outputs
 * @returns Deduplicated conversion tasks
 */
const dedupeTasksByOutputPath = (
  tasks: ConversionTask[],
  onWarn?: (message: string) => void,
): ConversionTask[] => {
  const groups = new Map<string, ConversionTask[]>()

  for (const task of tasks) {
    groups.set(task.outputPath, [...(groups.get(task.outputPath) ?? []), task])
  }

  return Array.from(groups.values()).map(group => {
    if (group.length === 1) return group[0]

    const preferredTask = selectPreferredTask(group)
    const skippedTasks = group.filter(task => task !== preferredTask)

    for (const skippedTask of skippedTasks) {
      onWarn?.(
        `Skipping ${pc.blue(skippedTask.sourceName)} because it would overwrite ${pc.green(path.basename(skippedTask.outputPath))} generated from ${pc.blue(preferredTask.sourceName)}`,
      )
    }

    return preferredTask
  })
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
  options: ConvertFontsInDirOptions = {},
): Promise<void> => {
  const { outputDir, formats = ['woff', 'woff2'], onProgress, onWarn } = options

  const fontFiles = findSourceFontFiles(dirPath)

  if (fontFiles.length === 0) {
    onWarn?.(`No TTF or OTF files found in ${pc.blue(dirPath)}`)

    return
  }

  const tasks: ConversionTask[] = fontFiles.flatMap(relPath => {
    const inputPath = path.join(dirPath, relPath)

    const resolvedOutputDir = outputDir
      ? path.join(outputDir, path.dirname(relPath))
      : path.dirname(inputPath)

    const normalizedBase = toHyphenated(
      path.basename(relPath, path.extname(relPath)),
    )
    const sourceName = path.basename(relPath)

    return formats.map(format => ({
      inputPath,
      outputPath: path.join(resolvedOutputDir, `${normalizedBase}.${format}`),
      format,
      sourceName,
      normalizedBase,
      onProgress,
      onWarn,
    }))
  })

  const dedupedTasks = dedupeTasksByOutputPath(tasks, onWarn)
  const results = await runWithPool(dedupedTasks, os.availableParallelism())
  const failureCount = results.filter(result => !result.success).length

  if (failureCount > 0) {
    throw new Error(
      `${failureCount} font conversion${failureCount === 1 ? '' : 's'} failed.`,
    )
  }
}

export default convertFontsInDir
