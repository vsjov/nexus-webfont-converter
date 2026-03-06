// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import path from 'node:path'


// Function
// -----------------------------------------------------------------------------
/**
 * Returns the names of all immediate subdirectories inside `dirPath`.
 * Entries that cannot be stat-ed are silently skipped.
 *
 * @param dirPath - Directory to scan
 */
export const getSubdirectories = (dirPath: string): string[] =>
  fs.readdirSync(dirPath).filter(entry => {
    try {
      return fs.statSync(path.join(dirPath, entry)).isDirectory()
    } catch {
      return false
    }
  })

export default getSubdirectories
