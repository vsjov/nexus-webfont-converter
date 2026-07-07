#!/usr/bin/env node

// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'

// Internal
import { runPipeline } from '../dist/index.js'

// Constants
// -----------------------------------------------------------------------------
const CURRENT_FILE = fileURLToPath(import.meta.url)
const CURRENT_DIR = path.dirname(CURRENT_FILE)
const PACKAGE_ROOT = path.resolve(CURRENT_DIR, '..')
const SAMPLE_INPUT_DIR = path.join(PACKAGE_ROOT, 'fonts-sample', 'input')
const DEFAULT_OUTPUT_DIR = path.join(PACKAGE_ROOT, 'fonts-sample', 'output')
const SOURCE_EXTENSIONS = new Set(['.ttf', '.otf'])
const WEBFONT_EXTENSIONS = new Set(['.woff', '.woff2'])
const GENERATED_EXTENSIONS = new Set(['.scss', '.css', '.html'])
const OUTPUT_FORMATS = new Set(['woff', 'woff2'])

// Functions
// -----------------------------------------------------------------------------
/**
 * Checks whether a path points to a directory.
 *
 * @param {string} dirPath - Directory path to inspect.
 * @returns {boolean} `true` when the path exists and is a directory.
 */
const isDirectory = dirPath => {
  try {
    return fs.statSync(dirPath).isDirectory()
  } catch {
    return false
  }
}

/**
 * Recursively counts files matching a predicate.
 *
 * @param {string} dirPath - Directory to scan.
 * @param {(filePath: string) => boolean} predicate - File predicate.
 * @returns {number} Number of matching files.
 */
const countFiles = (dirPath, predicate) => {
  if (!isDirectory(dirPath)) return 0

  let total = 0

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      total += countFiles(entryPath, predicate)
    } else if (entry.isFile() && predicate(entryPath)) {
      total += 1
    }
  }

  return total
}

/**
 * Counts immediate sample group directories.
 *
 * @returns {number} Number of sample groups.
 */
const countSampleGroups = () =>
  fs
    .readdirSync(SAMPLE_INPUT_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory()).length

/**
 * Parses script arguments.
 *
 * @param {string[]} args - CLI arguments.
 * @returns {{ formats?: string[], mode: 'benchmark' | 'verify', outputDir: string }} Parsed options.
 * @throws {Error} When an unknown argument is passed.
 */
const parseArgs = args => {
  let mode = 'verify'
  let formats
  let outputDir = process.env.FONT_SAMPLE_OUTPUT_DIR ?? DEFAULT_OUTPUT_DIR

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--benchmark') {
      mode = 'benchmark'
      continue
    }

    if (arg === '--verify') {
      mode = 'verify'
      continue
    }

    if (arg === '--formats') {
      formats = args[index + 1]
        ?.split(',')
        .map(format => format.trim())
        .filter(Boolean)
      index += 1
      continue
    }

    if (arg === '--out') {
      outputDir = args[index + 1]
      index += 1
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return {
    formats,
    mode,
    outputDir: path.resolve(outputDir),
  }
}

/**
 * Resolves output formats for the requested sample mode.
 *
 * @param {{ formats?: string[], mode: 'benchmark' | 'verify' }} options - Parsed options.
 * @returns {Array<'woff' | 'woff2'>} Output formats to generate.
 * @throws {Error} When an unsupported format is requested.
 */
const resolveFormats = options => {
  const formats = options.formats ?? ['woff', 'woff2']

  for (const format of formats) {
    if (!OUTPUT_FORMATS.has(format)) {
      throw new Error(`Unsupported format "${format}". Expected woff or woff2.`)
    }
  }

  return formats
}

/**
 * Ensures the output directory is safe for the sample runner to clean.
 *
 * @param {string} outputDir - Output directory to validate.
 * @returns {void}
 * @throws {Error} When the output directory is unsafe.
 */
const assertSafeOutputDir = outputDir => {
  const relativeToRoot = path.relative(PACKAGE_ROOT, outputDir)
  const relativeToInput = path.relative(SAMPLE_INPUT_DIR, outputDir)
  const isDefaultSampleOutput = outputDir === DEFAULT_OUTPUT_DIR

  if (outputDir === PACKAGE_ROOT || outputDir === SAMPLE_INPUT_DIR) {
    throw new Error('Refusing to use a source directory as sample output.')
  }

  if (
    !isDefaultSampleOutput &&
    relativeToRoot &&
    !relativeToRoot.startsWith('..') &&
    !path.isAbsolute(relativeToRoot)
  ) {
    throw new Error(
      'Refusing to clean an output directory inside the repository. Pass --out with a temporary path.',
    )
  }

  if (
    relativeToInput &&
    !relativeToInput.startsWith('..') &&
    !path.isAbsolute(relativeToInput)
  ) {
    throw new Error('Refusing to place sample output inside the sample input.')
  }
}

/**
 * Formats a duration in seconds.
 *
 * @param {number} milliseconds - Duration in milliseconds.
 * @returns {string} Duration rounded to two decimal places.
 */
const formatSeconds = milliseconds => `${(milliseconds / 1000).toFixed(2)}s`

/**
 * Runs the font sample conversion once and returns a summary.
 *
 * @param {{ formats: Array<'woff' | 'woff2'>, outputDir: string }} options - Runner options.
 * @returns {Promise<Record<string, number | string>>} Conversion summary.
 */
export const runFontSample = async ({ formats, outputDir }) => {
  if (!isDirectory(SAMPLE_INPUT_DIR)) {
    throw new Error(`Sample input directory not found: ${SAMPLE_INPUT_DIR}`)
  }

  assertSafeOutputDir(outputDir)
  fs.rmSync(outputDir, { recursive: true, force: true })
  fs.mkdirSync(outputDir, { recursive: true })

  const sourceFonts = countFiles(SAMPLE_INPUT_DIR, filePath =>
    SOURCE_EXTENSIONS.has(path.extname(filePath).toLowerCase()),
  )
  const sampleGroups = countSampleGroups()
  const startTime = performance.now()

  await runPipeline(SAMPLE_INPUT_DIR, outputDir, { formats })

  const durationMs = performance.now() - startTime
  const webFonts = countFiles(outputDir, filePath =>
    WEBFONT_EXTENSIONS.has(path.extname(filePath).toLowerCase()),
  )
  const generatedFiles = countFiles(outputDir, filePath =>
    GENERATED_EXTENSIONS.has(path.extname(filePath).toLowerCase()),
  )
  const licenseFiles = countFiles(outputDir, filePath => {
    const ext = path.extname(filePath).toLowerCase()

    return ext === '.txt' || ext === '.md' || ext === '.pdf' || ext === ''
  })

  return {
    inputDir: SAMPLE_INPUT_DIR,
    outputDir,
    sampleGroups,
    formats: formats.join(','),
    sourceFonts,
    webFonts,
    generatedFiles,
    licenseFiles,
    durationMs,
    fontsPerSecond: sourceFonts / (durationMs / 1000),
  }
}

/**
 * Verifies sample conversion output counts.
 *
 * @param {Record<string, number | string>} summary - Conversion summary.
 * @returns {void}
 * @throws {Error} When expected output files are missing.
 */
const verifySummary = summary => {
  const expectedWebFonts =
    Number(summary.sourceFonts) * String(summary.formats).split(',').length
  const expectedGeneratedFiles = Number(summary.sampleGroups) * 3

  if (summary.webFonts !== expectedWebFonts) {
    throw new Error(
      `Expected ${expectedWebFonts} webfonts, found ${summary.webFonts}.`,
    )
  }

  if (summary.generatedFiles !== expectedGeneratedFiles) {
    throw new Error(
      `Expected ${expectedGeneratedFiles} generated SCSS/CSS/HTML files, found ${summary.generatedFiles}.`,
    )
  }
}

/**
 * Prints a conversion summary.
 *
 * @param {Record<string, number | string>} summary - Conversion summary.
 * @param {'benchmark' | 'verify'} mode - Runner mode.
 * @returns {void}
 */
const printSummary = (summary, mode) => {
  console.log(`Sample mode: ${mode}`)
  console.log(`Input: ${summary.inputDir}`)
  console.log(`Output: ${summary.outputDir}`)
  console.log(`Formats: ${summary.formats}`)
  console.log(`Sample groups: ${summary.sampleGroups}`)
  console.log(`Source fonts: ${summary.sourceFonts}`)
  console.log(`Generated webfonts: ${summary.webFonts}`)
  console.log(`Generated SCSS/CSS/HTML files: ${summary.generatedFiles}`)
  console.log(`Copied license/readme files: ${summary.licenseFiles}`)
  console.log(`Duration: ${formatSeconds(Number(summary.durationMs))}`)
  console.log(
    `Throughput: ${Number(summary.fontsPerSecond).toFixed(2)} source fonts/s`,
  )
}

/**
 * Runs the sample CLI.
 *
 * @param {string[]} args - CLI arguments.
 * @returns {Promise<void>}
 */
export const main = async (args = process.argv.slice(2)) => {
  const options = parseArgs(args)
  const formats = resolveFormats(options)
  const summary = await runFontSample({ ...options, formats })

  if (options.mode === 'verify') {
    verifySummary(summary)
  }

  printSummary(summary, options.mode)
}

// Main
// -----------------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === CURRENT_FILE) {
  try {
    await main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

export default main
