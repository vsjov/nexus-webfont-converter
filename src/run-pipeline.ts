// Imports
// -----------------------------------------------------------------------------
// NodeJS
import { join } from 'node:path'

// External
import gulp from 'gulp'
import log from 'fancy-log'
import { deleteAsync } from 'del'

// Internal
import { convertFontsInDir } from './file-utils/convert-fonts-in-dir.js'
import { copyLicenseFiles } from './file-utils/copy-license-files.js'
import { generateFontFaceScss } from './scss/generate-font-face-scss.js'
import { compileCssFiles } from './scss/compile-css.js'
import { generateFontPreviewHtml } from './html/generate-font-preview-html.js'


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
  const cleanOutput = async () => {
    await deleteAsync([
      join(outputDir, '**', '*'),
      `!${join(outputDir, '.gitkeep')}`,
    ], { force: true, dot: true })

    log('Cleaned output directory')
  }

  const convertFonts = () => convertFontsInDir(inputDir, { outputDir, formats: ['woff', 'woff2'] })

  const copyLicenses = (cb: gulp.TaskFunctionCallback) => {
    copyLicenseFiles(inputDir, outputDir)
    cb()
  }

  const generateScss = (cb: gulp.TaskFunctionCallback) => {
    generateFontFaceScss(inputDir, outputDir)
    cb()
  }

  const compileCss = () => compileCssFiles(outputDir)

  const generateHtml = (cb: gulp.TaskFunctionCallback) => {
    generateFontPreviewHtml(inputDir, outputDir)
    cb()
  }

  const convertAndCopyLicenses = gulp.parallel(convertFonts, copyLicenses)

  const pipeline = gulp.series(
    cb => {
      log('Starting webfont conversion...')
      cb()
    },
    cleanOutput,
    convertAndCopyLicenses,
    generateScss,
    compileCss,
    generateHtml,
  )

  return new Promise((resolve, reject) => {
    pipeline(err => {
      if (err) {
        reject(err instanceof Error ? err : new Error(String(err)))
      } else {
        resolve()
      }
    })
  })
}

export default runPipeline
