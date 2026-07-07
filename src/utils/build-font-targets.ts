// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import path from 'node:path'

// Types
// -----------------------------------------------------------------------------
export type FontTarget = {
  outputFontDir: string
  dirName: string
}

type DirectoryEntry = string | fs.Dirent

// Helpers
// -----------------------------------------------------------------------------
/**
 * Checks whether a directory entry is a subdirectory.
 *
 * @param outputDir - Parent output directory
 * @param entry - Directory entry to inspect
 * @returns `true` when the entry is a directory
 */
const isSubdirectoryEntry = (
  outputDir: string,
  entry: DirectoryEntry,
): boolean => {
  if (typeof entry !== 'string') return entry.isDirectory()

  try {
    return fs.statSync(path.join(outputDir, entry)).isDirectory()
  } catch {
    return false
  }
}

/**
 * Gets the entry name from a directory entry.
 *
 * @param entry - Directory entry to read
 * @returns Directory entry name
 */
const getEntryName = (entry: DirectoryEntry): string =>
  typeof entry === 'string' ? entry : entry.name

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
  }) as DirectoryEntry[]

  const fontDirs = entries
    .filter(entry => isSubdirectoryEntry(outputDir, entry))
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
