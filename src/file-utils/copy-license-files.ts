// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import path from 'node:path'

// External
import log from 'fancy-log'
import pc from 'picocolors'


// Function
// -----------------------------------------------------------------------------
/**
 * Copies license files (`.txt` or files with no extension) from `inputDir` and
 * its immediate sub-directories to the corresponding paths under `outputDir`,
 * preserving the relative directory structure.
 *
 * @param inputDir - Root input directory (e.g. `build/in/`)
 * @param outputDir - Root output directory (e.g. `build/out/`)
 */
export const copyLicenseFiles = (inputDir: string, outputDir: string): void => {
  const allEntries = fs.readdirSync(inputDir, { recursive: true, encoding: 'utf-8' })

  const licenseFiles = allEntries.filter(entry => {
    if (path.basename(entry) === '.gitkeep') return false

    const ext = path.extname(entry).toLowerCase()
    if (ext !== '' && ext !== '.txt') return false

    return fs.statSync(path.join(inputDir, entry)).isFile()
  })

  if (licenseFiles.length === 0) {
    log(pc.yellow(`No license files found in ${pc.blue(inputDir)}`))

    return
  }

  for (const relPath of licenseFiles) {
    const destPath = path.join(outputDir, relPath)
    fs.mkdirSync(path.dirname(destPath), { recursive: true })
    fs.copyFileSync(path.join(inputDir, relPath), destPath)
    log(`Copied license ${pc.green(path.basename(relPath))} → ${pc.blue(path.dirname(destPath))}`)
  }
}

export default copyLicenseFiles
