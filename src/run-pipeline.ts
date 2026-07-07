// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import path from 'node:path'
import { join } from 'node:path'

// External
import gulp from 'gulp'
import { deleteAsync } from 'del'
import pc from 'picocolors'

// Internal
import {
  SOURCE_EXTENSIONS,
  LICENSE_EXTENSIONS,
  OUTPUT_FORMATS,
} from './config/constants.js'
import { getSubdirectories } from './utils/get-subdirectories.js'
import { convertFontsInDir } from './file-utils/convert-fonts-in-dir.js'
import { copyLicenseFiles } from './file-utils/copy-license-files.js'
import { generateFontFaceScss } from './scss/generate-font-face-scss.js'
import { compileCssFiles } from './scss/compile-css.js'
import { generateFontPreviewHtml } from './html/generate-font-preview-html.js'
import createProgress from './utils/progress.js'

// Helpers
// -----------------------------------------------------------------------------
/**
 * Counts source font files under a directory.
 *
 * @param dirPath - Directory to scan recursively
 * @returns Number of source font files
 */
const countFontFiles = (dirPath: string): number =>
  fs
    .readdirSync(dirPath, { recursive: true, withFileTypes: true })
    .filter(
      entry =>
        entry.isFile() &&
        SOURCE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase()),
    ).length

/**
 * Counts license files under a directory.
 *
 * @param dirPath - Directory to scan recursively
 * @returns Number of license files
 */
const countLicenseFiles = (dirPath: string): number =>
  fs
    .readdirSync(dirPath, { recursive: true, withFileTypes: true })
    .filter(entry => {
      if (!entry.isFile() || entry.name === '.gitkeep') return false

      return LICENSE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())
    }).length

/**
 * Checks whether a directory contains source font files directly inside it.
 *
 * @param dirPath - Directory to scan
 * @returns `true` when direct child font files exist
 */
const hasDirectFontFiles = (dirPath: string): boolean =>
  fs
    .readdirSync(dirPath, { withFileTypes: true })
    .some(
      entry =>
        entry.isFile() &&
        SOURCE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase()),
    )

/**
 * Counts directories that will produce SCSS and HTML progress ticks.
 *
 * @param inputDir - Root input directory
 * @returns Number of font-generation directories
 */
const countFontGenerationDirs = (inputDir: string): number => {
  const subdirectories = getSubdirectories(inputDir)

  if (subdirectories.length === 0) return hasDirectFontFiles(inputDir) ? 1 : 0

  return subdirectories.filter(dirName =>
    hasDirectFontFiles(path.join(inputDir, dirName)),
  ).length
}

const computeTotalSteps = (
  inputDir: string,
  formats: readonly string[],
): number => {
  const fontCount = countFontFiles(inputDir)
  const licenseCount = countLicenseFiles(inputDir)
  const fontDirCount = countFontGenerationDirs(inputDir)

  return (
    1 + // clean
    fontCount * formats.length + // font conversions
    licenseCount + // license copies
    fontDirCount + // SCSS per family
    1 + // CSS compilation
    fontDirCount // HTML per family
  )
}

// Function
// -----------------------------------------------------------------------------
/**
 * Runs the full webfont conversion pipeline: cleans the output directory,
 * converts fonts to WOFF/WOFF2, copies license files, generates SCSS/CSS,
 * and creates an HTML preview page.
 *
 * @param inputDir - Absolute path to the directory containing source TTF/OTF fonts
 * @param outputDir - Absolute path to the output directory for converted files
 */
const runPipeline = (inputDir: string, outputDir: string): Promise<void> => {
  const formats = OUTPUT_FORMATS
  const total = computeTotalSteps(inputDir, formats)
  const progress = createProgress(total)
  const warnings: string[] = []
  const warn = (msg: string) => warnings.push(msg)

  const cleanOutput = async () => {
    await deleteAsync(
      [join(outputDir, '**', '*'), `!${join(outputDir, '.gitkeep')}`],
      { force: true, dot: true },
    )

    progress.tick('Cleaned output directory')
  }

  const convertFonts = () =>
    convertFontsInDir(inputDir, {
      outputDir,
      formats: [...OUTPUT_FORMATS],
      onProgress: label => progress.tick(label),
      onWarn: warn,
    })

  const copyLicenses = (cb: gulp.TaskFunctionCallback) => {
    copyLicenseFiles(inputDir, outputDir, {
      onProgress: label => progress.tick(label),
      onWarn: warn,
    })

    cb()
  }

  const generateScss = (cb: gulp.TaskFunctionCallback) => {
    generateFontFaceScss(inputDir, outputDir, {
      onProgress: label => progress.tick(label),
      onWarn: warn,
    })

    cb()
  }

  const compileCss = () =>
    compileCssFiles(outputDir).on('end', () => {
      progress.tick('Compiled CSS')
    })

  const generateHtml = (cb: gulp.TaskFunctionCallback) => {
    generateFontPreviewHtml(inputDir, outputDir, {
      onProgress: label => progress.tick(label),
      onWarn: warn,
    })

    cb()
  }

  const convertAndCopyLicenses = gulp.parallel(convertFonts, copyLicenses)

  const pipeline = gulp.series(
    cleanOutput,
    convertAndCopyLicenses,
    generateScss,
    compileCss,
    generateHtml,
  )

  return new Promise((resolve, reject) => {
    pipeline(err => {
      progress.stop('Done')

      if (warnings.length > 0) {
        process.stderr.write(
          warnings.map(w => `${pc.yellow('Warning:')} ${w}`).join('\n') + '\n',
        )
      }

      if (err) {
        reject(err instanceof Error ? err : new Error(String(err)))
      } else {
        process.stdout.write(`\nSaved to: ${pc.magenta(outputDir)}\n`)
        resolve()
      }
    })
  })
}

export default runPipeline
