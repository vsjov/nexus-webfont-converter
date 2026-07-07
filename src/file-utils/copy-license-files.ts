// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import path from 'node:path'

// External
import pc from 'picocolors'

// Config
import { LICENSE_EXTENSIONS } from '../config/constants.js'

// Types
import type { ProgressOptions } from '../utils/progress.js'

// Types
// -----------------------------------------------------------------------------
export type CopyLicenseFilesOptions = ProgressOptions & {
  sourceLicenseFiles?: string[]
}

type RecursiveDirent = fs.Dirent & {
  parentPath?: string
  path?: string
}

type RecursiveEntry = string | RecursiveDirent

// Helpers
// -----------------------------------------------------------------------------
/**
 * Converts a recursive dirent into a path relative to the scanned root.
 *
 * @param rootDir - Directory passed to `readdirSync`
 * @param entry - Dirent returned from recursive `readdirSync`
 * @returns Relative path for the entry
 */
const getRelativeDirentPath = (
  rootDir: string,
  entry: RecursiveDirent,
): string => {
  const parentPath = entry.parentPath ?? entry.path ?? rootDir

  return path.relative(rootDir, path.join(parentPath, entry.name))
}

/**
 * Converts a recursive directory entry into a relative path.
 *
 * @param rootDir - Directory passed to `readdirSync`
 * @param entry - Recursive directory entry to convert
 * @returns Relative entry path
 */
const getRelativeEntryPath = (rootDir: string, entry: RecursiveEntry): string =>
  typeof entry === 'string' ? entry : getRelativeDirentPath(rootDir, entry)

/**
 * Checks whether a recursive directory entry is a license file.
 *
 * @param entry - Recursive directory entry to inspect
 * @returns `true` when the entry is a license file
 */
const isLicenseFileEntry = (
  inputDir: string,
  entry: RecursiveEntry,
): boolean => {
  const entryName = typeof entry === 'string' ? entry : entry.name

  if (path.basename(entryName) === '.gitkeep') return false

  const ext = path.extname(entryName).toLowerCase()
  if (!LICENSE_EXTENSIONS.includes(ext)) return false

  if (typeof entry !== 'string') return entry.isFile()

  try {
    return fs.statSync(path.join(inputDir, entry)).isFile()
  } catch {
    return false
  }
}

/**
 * Finds license files under a directory.
 *
 * @param inputDir - Directory to scan recursively
 * @returns Relative license file paths
 */
const findLicenseFiles = (inputDir: string): string[] =>
  (
    fs.readdirSync(inputDir, {
      recursive: true,
      withFileTypes: true,
    }) as RecursiveEntry[]
  )
    .filter(entry => isLicenseFileEntry(inputDir, entry))
    .map(entry => getRelativeEntryPath(inputDir, entry))

// Function
// -----------------------------------------------------------------------------
/**
 * Copies license files (`.txt`, `.md`, `.pdf`, or files with no extension) from
 * `inputDir` and its nested sub-directories to the corresponding paths under
 * `outputDir`, preserving the relative directory structure.
 *
 * @param inputDir - Root input directory (e.g. `build/in/`)
 * @param outputDir - Root output directory (e.g. `build/out/`)
 * @param options - Progress callbacks and optional pre-scanned license files
 */
export const copyLicenseFiles = (
  inputDir: string,
  outputDir: string,
  options: CopyLicenseFilesOptions = {},
): void => {
  const { sourceLicenseFiles, onProgress } = options
  const licenseFiles = sourceLicenseFiles ?? findLicenseFiles(inputDir)

  if (licenseFiles.length === 0) {
    return
  }

  for (const relPath of licenseFiles) {
    const destPath = path.join(outputDir, relPath)
    fs.mkdirSync(path.dirname(destPath), { recursive: true })
    fs.copyFileSync(path.join(inputDir, relPath), destPath)
    onProgress?.(
      `Copied license ${pc.green(path.basename(relPath))} -> ${pc.blue(path.dirname(destPath))}`,
    )
  }
}

export default copyLicenseFiles
