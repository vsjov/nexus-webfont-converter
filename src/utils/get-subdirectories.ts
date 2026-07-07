// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'

// Internal
import { getEntryName } from './get-entry-name.js'
import { isDirectoryEntry } from './is-directory-entry.js'

// Function
// -----------------------------------------------------------------------------
/**
 * Returns the names of all immediate subdirectories inside `dirPath`.
 *
 * @param dirPath - Directory to scan
 * @returns Immediate subdirectory names
 */
export const getSubdirectories = (dirPath: string): string[] =>
  fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter(entry => isDirectoryEntry(dirPath, entry))
    .map(getEntryName)

export default getSubdirectories
