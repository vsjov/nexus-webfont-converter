// Imports
// -----------------------------------------------------------------------------
// Internal
import { generateScssForDir } from './utils/generate-scss-for-dir.js'
import forEachFontDir from '../utils/for-each-font-dir.js'

// Types
import type { ProgressOptions } from '../utils/progress.js'


// Function
// -----------------------------------------------------------------------------
/**
 * Iterates all direct subdirectories of `inputDir` and generates a
 * `[font-name].scss` file in the corresponding `outputDir/[font-name]/`
 * subdirectory.
 *
 * @param inputDir - Root input directory (e.g. `build/in/`)
 * @param outputDir - Root output directory (e.g. `build/out/`)
 *
 * @example
 * ```ts
 * generateFontFaceScss('./build/in', './build/out')
 * // -> writes build/out/dm-sans/dm-sans.scss
 * ```
 */
export const generateFontFaceScss = (
  inputDir: string,
  outputDir: string,
  progress: ProgressOptions = {}
): void => {
  forEachFontDir(inputDir, outputDir, progress.onWarn, (fontDir, outputFontDir, dirName) => {
    generateScssForDir(fontDir, outputFontDir, dirName, progress)
  })
}
