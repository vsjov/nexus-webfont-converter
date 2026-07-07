// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import path from 'node:path'

// External
// @ts-expect-error - no type declarations available for ttf2woff
import ttf2woff from 'ttf2woff'

// Function
// -----------------------------------------------------------------------------
/**
 * Converts a single TTF or OTF font file to WOFF format and writes the result
 * to the specified output path.
 *
 * @param inputPath - Absolute or relative path to the source `.ttf` / `.otf`
 * file
 * @param outputPath - Absolute or relative path where the `.woff` file will be
 * written
 * @param inputBuffer - Optional pre-read source font buffer
 * @returns Resolves after the WOFF file is written
 */
export const convertFontToWoff = async (
  inputPath: string,
  outputPath: string,
  inputBuffer?: Uint8Array,
): Promise<void> => {
  const sourceBuffer = inputBuffer ?? (await fs.promises.readFile(inputPath))
  const woffResult: Uint8Array = ttf2woff(sourceBuffer)
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.promises.writeFile(outputPath, woffResult)
}

export default convertFontToWoff
