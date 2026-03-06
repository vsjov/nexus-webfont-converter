// Imports
// -----------------------------------------------------------------------------
// NodeJS
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// External
import gulp from 'gulp'
import log from 'fancy-log'
import { deleteAsync } from 'del'

// Internal
import { fontConverterPaths } from './config/paths.js'
import { convertFontsInDir } from './file-utils/convert-fonts-in-dir.js'
import { copyLicenseFiles } from './file-utils/copy-license-files.js'
import { generateFontFaceScss } from './scss/generate-font-face-scss.js'
import { compileCssFiles } from './scss/compile-css.js'
import { generateFontPreviewHtml } from './html/generate-font-preview-html.js'


// Setup
// -----------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Resolve to the package root (one level up from dist/)
const PACKAGE_ROOT = join(__dirname, '..')


// Paths
// -----------------------------------------------------------------------------
const PATHS = fontConverterPaths({
  rootDir: PACKAGE_ROOT,
  inputDir: 'build/in',
  outputDir: 'build/out',
})


// Tasks
// -----------------------------------------------------------------------------
const cleanOutput = async () => {
  await deleteAsync([
    join(PATHS.convert.out, '**', '*'),
    `!${join(PATHS.convert.out, '.gitkeep')}`,
  ], { force: true, dot: true })

  log('Cleaned output directory')
}

const convertFontsWoff = (cb: gulp.TaskFunctionCallback) => {
  convertFontsInDir(PATHS.convert.in, { outputDir: PATHS.convert.out, formats: ['woff'] })
  cb()
}

const convertFontsWoff2 = (cb: gulp.TaskFunctionCallback) => {
  convertFontsInDir(PATHS.convert.in, { outputDir: PATHS.convert.out, formats: ['woff2'] })
  cb()
}

const generateScss = (cb: gulp.TaskFunctionCallback) => {
  generateFontFaceScss(PATHS.convert.in, PATHS.convert.out)
  cb()
}

const compileCss = () => compileCssFiles(PATHS.convert.out)

const generateHtml = (cb: gulp.TaskFunctionCallback) => {
  generateFontPreviewHtml(PATHS.convert.in, PATHS.convert.out)
  cb()
}

const copyLicenses = (cb: gulp.TaskFunctionCallback) => {
  copyLicenseFiles(PATHS.convert.in, PATHS.convert.out)
  cb()
}

const convertFonts = gulp.parallel(convertFontsWoff, convertFontsWoff2, copyLicenses)


// Exports
// -----------------------------------------------------------------------------
export const convert = gulp.series(
  cb => {
    log('Starting webfont conversion...')
    cb()
  },
  cleanOutput,
  convertFonts,
  generateScss,
  compileCss,
  generateHtml
)

export default convert
