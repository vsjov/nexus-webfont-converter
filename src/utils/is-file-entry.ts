// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import path from 'node:path'

import type { Dirent } from 'node:fs'

// Functions
// -----------------------------------------------------------------------------
/**
 * Checks whether a directory entry is a file.
 *
 * @param dirPath - Parent directory path
 * @param entry - Directory entry to inspect
 * @returns `true` when the entry is a file
 */
export const isFileEntry = (
  dirPath: string,
  entry: string | Dirent,
): boolean => {
  if (typeof entry !== 'string') return entry.isFile()

  try {
    return fs.statSync(path.join(dirPath, entry)).isFile()
  } catch {
    return false
  }
}

export default isFileEntry
