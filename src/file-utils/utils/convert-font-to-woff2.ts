// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import path from 'node:path'

// External
import ttf2woff2 from 'ttf2woff2'


// Function
// -----------------------------------------------------------------------------
/**
 * Converts a single TTF or OTF font file to WOFF2 format and writes the result
 * to the specified output path.
 *
 * @param inputPath - Absolute or relative path to the source `.ttf` / `.otf`
 * file
 * @param outputPath - Absolute or relative path where the `.woff2` file will be
 * written
 */
export const convertFontToWoff2 = (inputPath: string, outputPath: string): void => {
  const inputBuffer = fs.readFileSync(inputPath)
  const woff2Buffer: Uint8Array = ttf2woff2(inputBuffer)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, woff2Buffer)
}

export default convertFontToWoff2
