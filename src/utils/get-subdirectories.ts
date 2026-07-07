// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import path from 'node:path'

// Types
// -----------------------------------------------------------------------------
type DirectoryEntry = string | fs.Dirent

// Helpers
// -----------------------------------------------------------------------------
/**
 * Checks whether a directory entry is a subdirectory.
 *
 * @param dirPath - Parent directory path
 * @param entry - Directory entry to inspect
 * @returns `true` when the entry is a directory
 */
const isSubdirectoryEntry = (
  dirPath: string,
  entry: DirectoryEntry,
): boolean => {
  if (typeof entry !== 'string') return entry.isDirectory()

  try {
    return fs.statSync(path.join(dirPath, entry)).isDirectory()
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
 * Returns the names of all immediate subdirectories inside `dirPath`.
 *
 * @param dirPath - Directory to scan
 * @returns Immediate subdirectory names
 */
export const getSubdirectories = (dirPath: string): string[] =>
  (fs.readdirSync(dirPath, { withFileTypes: true }) as DirectoryEntry[])
    .filter(entry => isSubdirectoryEntry(dirPath, entry))
    .map(getEntryName)

export default getSubdirectories
