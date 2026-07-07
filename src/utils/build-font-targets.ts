// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import path from 'node:path'

// Internal
import { getEntryName } from './get-entry-name.js'
import { isDirectoryEntry } from './is-directory-entry.js'

// Types
// -----------------------------------------------------------------------------
export type FontTarget = {
  outputFontDir: string
  dirName: string
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
 * @returns Font family targets
 */
export const buildFontTargets = (outputDir: string): FontTarget[] => {
  const entries = fs.readdirSync(outputDir, {
    withFileTypes: true,
  })

  const fontDirs = entries
    .filter(entry => isDirectoryEntry(outputDir, entry))
    .map(getEntryName)

  if (fontDirs.length > 0) {
    return fontDirs.map(dirName => ({
      outputFontDir: path.join(outputDir, dirName),
      dirName,
    }))
  }

  return entries
    .map(getEntryName)
    .filter(
      e =>
        path.extname(e).toLowerCase() === '.scss' &&
        !path.basename(e).startsWith('_'),
    )
    .map(f => ({
      outputFontDir: outputDir,
      dirName: path.basename(f, '.scss'),
    }))
}

export default buildFontTargets
