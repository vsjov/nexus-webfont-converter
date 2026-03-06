// Imports
// -----------------------------------------------------------------------------
// Internal
import { generateHtmlForDir } from './utils/generate-html-for-dir.js'
import forEachFontDir from '../utils/for-each-font-dir.js'

// Types
import type { ProgressOptions } from '../utils/progress.js'


// Functions
// -----------------------------------------------------------------------------
/**
 * Iterates all direct subdirectories of `inputDir` and generates an HTML
 * preview page in the corresponding `outputDir/[font-name]/` subdirectory.
 *
 * @param inputDir - Root input directory (e.g. `build/in/`)
 * @param outputDir - Root output directory (e.g. `build/out/`)
 */
export const generateFontPreviewHtml = (
  inputDir: string,
  outputDir: string,
  progress: ProgressOptions = {}
): void => {
  forEachFontDir(inputDir, outputDir, progress.onWarn, (fontDir, outputFontDir, dirName) => {
    generateHtmlForDir(fontDir, outputFontDir, dirName, progress)
  })
}

export default generateFontPreviewHtml
