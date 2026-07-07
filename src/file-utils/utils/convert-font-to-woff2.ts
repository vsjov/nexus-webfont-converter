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
 * @param inputBuffer - Optional pre-read source font buffer
 * @returns Resolves after the WOFF2 file is written
 */
export const convertFontToWoff2 = async (
  inputPath: string,
  outputPath: string,
  inputBuffer?: Uint8Array,
): Promise<void> => {
  const sourceBuffer = inputBuffer ?? (await fs.promises.readFile(inputPath))
  const woff2Buffer: Uint8Array = ttf2woff2(sourceBuffer)
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.promises.writeFile(outputPath, woff2Buffer)
}

export default convertFontToWoff2
