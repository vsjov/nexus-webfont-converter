// Imports
// -----------------------------------------------------------------------------
// NodeJS
import path from 'node:path'

import type { Dirent } from 'node:fs'

// Types
// -----------------------------------------------------------------------------
export type RecursiveDirent = Dirent & {
  parentPath?: string
  path?: string
}

// Functions
// -----------------------------------------------------------------------------
/**
 * Converts a recursive dirent into a path relative to the scanned root.
 *
 * @param rootDir - Directory passed to `readdirSync`
 * @param entry - Dirent returned from recursive `readdirSync`
 * @returns Relative path for the entry
 */
export const getRelativeDirentPath = (
  rootDir: string,
  entry: RecursiveDirent,
): string => {
  const parentPath = entry.parentPath ?? entry.path ?? rootDir

  return path.relative(rootDir, path.join(parentPath, entry.name))
}

export default getRelativeDirentPath
