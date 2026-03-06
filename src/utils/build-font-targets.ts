// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import path from 'node:path'


// Types
// -----------------------------------------------------------------------------
export type FontTarget = {
  outputFontDir: string,
  dirName: string,
}


// Function
// -----------------------------------------------------------------------------
/**
 * Resolves the list of font family targets from `outputDir`.
 *
 * - If `outputDir` contains subdirectories, each subdirectory is a target.
 * - Otherwise falls back to treating every `.scss` file in `outputDir` as a
 *   target (flat layout).
 *
 * @param outputDir - Root output directory (e.g. `build/out/`)
 */
export const buildFontTargets = (outputDir: string): FontTarget[] => {
  const entries = fs.readdirSync(outputDir)

  const fontDirs = entries.filter(entry => {
    try {
      return fs.statSync(path.join(outputDir, entry)).isDirectory()
    } catch {
      return false
    }
  })

  if (fontDirs.length > 0) {
    return fontDirs.map(dirName => ({ outputFontDir: path.join(outputDir, dirName), dirName }))
  }

  return entries
    .filter(e => path.extname(e).toLowerCase() === '.scss' && !path.basename(e).startsWith('_'))
    .map(f => ({ outputFontDir: outputDir, dirName: path.basename(f, '.scss') }))
}

export default buildFontTargets
