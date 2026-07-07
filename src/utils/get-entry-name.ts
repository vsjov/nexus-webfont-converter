// Imports
// -----------------------------------------------------------------------------
// NodeJS
import type { Dirent } from 'node:fs'

// Functions
// -----------------------------------------------------------------------------
/**
 * Gets the name from either a string entry or a filesystem dirent.
 *
 * @param entry - Directory entry to read
 * @returns Directory entry name
 */
export const getEntryName = (entry: string | Dirent): string =>
  typeof entry === 'string' ? entry : entry.name

export default getEntryName
