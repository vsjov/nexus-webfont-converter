// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import path from 'node:path'

// Config
import { LICENSE_EXTENSIONS } from '../config/constants.js'

// Types
// -----------------------------------------------------------------------------
type DirectoryEntry = string | fs.Dirent

// Helpers
// -----------------------------------------------------------------------------
/**
 * Gets the entry name from a directory entry.
 *
 * @param entry - Directory entry to read
 * @returns Directory entry name
 */
const getEntryName = (entry: DirectoryEntry): string =>
  typeof entry === 'string' ? entry : entry.name

/**
 * Checks whether a directory entry is a file.
 *
 * @param dirPath - Parent directory path
 * @param entry - Directory entry to inspect
 * @returns `true` when the entry is a file
 */
const isFileEntry = (dirPath: string, entry: DirectoryEntry): boolean => {
  if (typeof entry !== 'string') return entry.isFile()

  try {
    return fs.statSync(path.join(dirPath, entry)).isFile()
  } catch {
    return false
  }
}

// Function
// -----------------------------------------------------------------------------
/**
 * Finds the first license file (`.txt`, `.md`, `.pdf`, or extension-less) in `dirPath`.
 * Returns `null` if the directory does not exist or contains no license file.
 *
 * @param dirPath - Directory to search
 * @returns License filename or `null`
 */
export const findLicenseFile = (dirPath: string): string | null => {
  if (!fs.existsSync(dirPath)) return null

  const licenseEntry = (
    fs.readdirSync(dirPath, { withFileTypes: true }) as DirectoryEntry[]
  ).find(entry => {
    const entryName = getEntryName(entry)
    const ext = path.extname(entryName).toLowerCase()

    return isFileEntry(dirPath, entry) && LICENSE_EXTENSIONS.includes(ext)
  })

  return licenseEntry ? getEntryName(licenseEntry) : null
}

export default findLicenseFile
