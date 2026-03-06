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


// Function
// -----------------------------------------------------------------------------
/**
 * Copies license files (`.txt`, `.md`, `.pdf`, or files with no extension) from
 * `inputDir` and its immediate sub-directories to the corresponding paths under
 * `outputDir`, preserving the relative directory structure.
 *
 * @param inputDir - Root input directory (e.g. `build/in/`)
 * @param outputDir - Root output directory (e.g. `build/out/`)
 * @param progress - Progress and warning callbacks
 */
export const copyLicenseFiles = (inputDir: string, outputDir: string, progress: ProgressOptions = {}): void => {
  const { onProgress } = progress
  const allEntries = fs.readdirSync(inputDir, { recursive: true, encoding: 'utf-8' })

  const licenseFiles = allEntries.filter(entry => {
    if (path.basename(entry) === '.gitkeep') return false

    const ext = path.extname(entry).toLowerCase()
    if (!LICENSE_EXTENSIONS.includes(ext)) return false

    return fs.statSync(path.join(inputDir, entry)).isFile()
  })

  if (licenseFiles.length === 0) {
    return
  }

  for (const relPath of licenseFiles) {
    const destPath = path.join(outputDir, relPath)
    fs.mkdirSync(path.dirname(destPath), { recursive: true })
    fs.copyFileSync(path.join(inputDir, relPath), destPath)
    onProgress?.(`Copied license ${pc.green(path.basename(relPath))} -> ${pc.blue(path.dirname(destPath))}`)
  }
}

export default copyLicenseFiles
