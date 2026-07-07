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
import {
  getRelativeDirentPath,
  type RecursiveDirent,
} from '../utils/get-relative-dirent-path.js'
import { toHyphenated } from '../utils/to-hyphenated.js'

// Types
import type { OutputFormat } from '../config/constants.js'
import type { ProgressOptions } from '../utils/progress.js'

// Types
// -----------------------------------------------------------------------------
export type ConvertFontsInDirOptions = ProgressOptions & {
  outputDir?: string
  formats?: OutputFormat[]
  sourceFontFiles?: string[]
}

type ConversionTask = {
  inputPath: string
  sourceName: string
  normalizedBase: string
  outputs: ConversionOutput[]
  onProgress?: (label: string) => void
  onWarn?: (message: string) => void
}

type ConversionTaskResult = {
  format: OutputFormat
  success: boolean
  error?: string
}

type ConversionOutput = {
  outputPath: string
  format: OutputFormat
}

type ConversionOutputCandidate = ConversionOutput & {
  inputPath: string
  sourceName: string
  normalizedBase: string
}

type RecursiveEntry = string | RecursiveDirent

// Helpers
// -----------------------------------------------------------------------------
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
 * Converts one source font to one or more output formats in a worker thread.
 *
 * @param task - Conversion task metadata and callbacks
 * @returns Worker conversion results
 */
const runTask = (task: ConversionTask): Promise<ConversionTaskResult[]> =>
  new Promise(resolve => {
    let isSettled = false
    const worker = new Worker(
      new URL('./utils/font-conversion-worker.js', import.meta.url),
      {
        workerData: {
          inputPath: task.inputPath,
          outputs: task.outputs,
        },
      },
    )

    const settle = (results: ConversionTaskResult[]) => {
      if (isSettled) return

      isSettled = true

      for (const result of results) {
        if (result.success) {
          task.onProgress?.(
            `Generated ${pc.green(`${task.normalizedBase}.${result.format}`)} from ${pc.blue(task.sourceName)}`,
          )
        } else {
          task.onWarn?.(
            `Failed to convert ${pc.blue(task.sourceName)} to ${result.format.toUpperCase()}: ${result.error}`,
          )
        }
      }

      resolve(results)
    }

    worker.on('message', (msg: { results: ConversionTaskResult[] }) => {
      settle(msg.results)
    })

    worker.on('error', (err: Error) => {
      settle(
        task.outputs.map(output => ({
          format: output.format,
          success: false,
          error: `Worker error: ${err.message}`,
        })),
      )
    })

    worker.on('exit', (code: number) => {
      if (isSettled) return

      settle(
        task.outputs.map(output => ({
          format: output.format,
          success: false,
          error: `Worker exited before sending a conversion result with code ${code}`,
        })),
      )
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
      if (task) results.push(...(await runTask(task)))
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
 * @param candidates - Output candidates that target the same output path
 * @returns Preferred output candidate to keep
 */
const selectPreferredCandidate = (
  candidates: ConversionOutputCandidate[],
): ConversionOutputCandidate => {
  return [...candidates].sort((a, b) => {
    const extA = path.extname(a.inputPath).toLowerCase()
    const extB = path.extname(b.inputPath).toLowerCase()
    const rankA = extA === '.ttf' ? 0 : 1
    const rankB = extB === '.ttf' ? 0 : 1

    if (rankA !== rankB) return rankA - rankB

    return a.sourceName.localeCompare(b.sourceName)
  })[0]
}

/**
 * Removes output candidates that would write to the same output path.
 *
 * @param candidates - Candidate conversion outputs
 * @param onWarn - Optional warning callback for skipped duplicate outputs
 * @returns Deduplicated conversion outputs
 */
const dedupeCandidatesByOutputPath = (
  candidates: ConversionOutputCandidate[],
  onWarn?: (message: string) => void,
): ConversionOutputCandidate[] => {
  const groups = new Map<string, ConversionOutputCandidate[]>()

  for (const candidate of candidates) {
    groups.set(candidate.outputPath, [
      ...(groups.get(candidate.outputPath) ?? []),
      candidate,
    ])
  }

  return Array.from(groups.values()).map(group => {
    if (group.length === 1) return group[0]

    const preferredCandidate = selectPreferredCandidate(group)
    const skippedCandidates = group.filter(
      candidate => candidate !== preferredCandidate,
    )

    for (const skippedCandidate of skippedCandidates) {
      onWarn?.(
        `Skipping ${pc.blue(skippedCandidate.sourceName)} because it would overwrite ${pc.green(path.basename(skippedCandidate.outputPath))} generated from ${pc.blue(preferredCandidate.sourceName)}`,
      )
    }

    return preferredCandidate
  })
}

/**
 * Groups output candidates into one worker task per source font.
 *
 * @param candidates - Deduplicated output candidates
 * @param onProgress - Optional progress callback
 * @param onWarn - Optional warning callback
 * @returns Conversion tasks grouped by source file
 */
const groupCandidatesBySource = (
  candidates: ConversionOutputCandidate[],
  onProgress?: (label: string) => void,
  onWarn?: (message: string) => void,
): ConversionTask[] => {
  const tasksByInputPath = new Map<string, ConversionTask>()

  for (const candidate of candidates) {
    const task = tasksByInputPath.get(candidate.inputPath)

    if (task) {
      task.outputs.push({
        outputPath: candidate.outputPath,
        format: candidate.format,
      })
      continue
    }

    tasksByInputPath.set(candidate.inputPath, {
      inputPath: candidate.inputPath,
      sourceName: candidate.sourceName,
      normalizedBase: candidate.normalizedBase,
      outputs: [
        {
          outputPath: candidate.outputPath,
          format: candidate.format,
        },
      ],
      onProgress,
      onWarn,
    })
  }

  return Array.from(tasksByInputPath.values())
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
 * @param options.sourceFontFiles - Pre-scanned source font paths relative to `dirPath`
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
  const {
    outputDir,
    formats = ['woff', 'woff2'],
    sourceFontFiles,
    onProgress,
    onWarn,
  } = options

  const fontFiles = sourceFontFiles ?? findSourceFontFiles(dirPath)

  if (fontFiles.length === 0) {
    onWarn?.(`No TTF or OTF files found in ${pc.blue(dirPath)}`)

    return
  }

  const candidates: ConversionOutputCandidate[] = fontFiles.flatMap(relPath => {
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
    }))
  })

  const dedupedCandidates = dedupeCandidatesByOutputPath(candidates, onWarn)
  const tasks = groupCandidatesBySource(dedupedCandidates, onProgress, onWarn)
  const results = await runWithPool(tasks, os.availableParallelism())
  const failureCount = results.filter(result => !result.success).length

  if (failureCount > 0) {
    throw new Error(
      `${failureCount} font conversion${failureCount === 1 ? '' : 's'} failed.`,
    )
  }
}

export default convertFontsInDir
