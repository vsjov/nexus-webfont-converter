// Imports
// -----------------------------------------------------------------------------
// NodeJS
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// External
import { series } from 'gulp'

// Internal
import { fontConverterPaths } from './config/paths.js'
import runPipeline from './run-pipeline.js'
import { compileCssFiles } from './scss/compile-css.js'
import { regenerateFontPreviewHtml } from './html/regenerate-font-preview-html.js'
import { removeUnusedFonts } from './file-utils/remove-unused-fonts.js'


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


// Exports
// -----------------------------------------------------------------------------
export const convert = () => runPipeline(PATHS.convert.in, PATHS.convert.out)

export const compileCss = () => compileCssFiles(PATHS.convert.out)

export const recompileHtml = () => Promise.resolve(regenerateFontPreviewHtml(PATHS.convert.out))

export const removeUnused = () => Promise.resolve(removeUnusedFonts(PATHS.convert.out))

export const sync = series(compileCss, recompileHtml, removeUnused)

export default convert
