// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import path from 'node:path'

// External
import log from 'fancy-log'
import pc from 'picocolors'

// Internal
import { generateScssForDir } from './utils/generate-scss-for-dir.js'


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
 * // → writes build/out/dm-sans/dm-sans.scss
 * ```
 */
export const generateFontFaceScss = (
  inputDir: string,
  outputDir: string
): void => {
  const entries = fs.readdirSync(inputDir)

  const fontDirs = entries.filter(entry => {
    try {
      return fs.statSync(path.join(inputDir, entry)).isDirectory()
    } catch {
      return false
    }
  })

  if (fontDirs.length === 0) {
    log(pc.yellow(`No font subdirectories found in ${pc.blue(inputDir)}`))

    return
  }

  for (const dirName of fontDirs) {
    generateScssForDir(
      path.join(inputDir, dirName),
      path.join(outputDir, dirName),
      dirName
    )
  }
}
