// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import path from 'node:path'

// External
import log from 'fancy-log'
import pc from 'picocolors'

// Internal
import { SOURCE_EXTENSIONS } from '../../config/constants.js'
import { inferFontFamilyName } from '../../utils/infer-font-family-name.js'
import { buildFontEntries } from '../../utils/build-font-entries.js'
import { templateHtmlSamples } from './template-html-samples.js'


// Function
// -----------------------------------------------------------------------------
/**
 * Generates a `[font-name].html` preview page for a single font family
 * directory.
 *
 * @param fontDir - Directory containing the source font files (TTF / OTF)
 * @param outputFontDir - Directory where the `.html` file will be written
 * @param dirName - Directory basename
 */
export const generateHtmlForDir = (
  fontDir: string,
  outputFontDir: string,
  dirName: string
): void => {
  const entries = fs.readdirSync(fontDir)
  const fontFiles = entries.filter(f => SOURCE_EXTENSIONS.includes(path.extname(f).toLowerCase()))

  if (fontFiles.length === 0) {
    log(pc.yellow(`No TTF or OTF files found in ${pc.blue(fontDir)} — skipping HTML generation`))

    return
  }

  const familyName = inferFontFamilyName(dirName)

  const licenseFile = fs.existsSync(outputFontDir)
    ? (fs.readdirSync(outputFontDir).find(f => {
        const ext = path.extname(f).toLowerCase()

        return fs.statSync(path.join(outputFontDir, f)).isFile() && (ext === '.txt' || ext === '')
      }) ?? null)
    : null

  const fontEntries = buildFontEntries(fontFiles)

  const html = templateHtmlSamples({
    familyName,
    dirName,
    entries: fontEntries,
    glyphs: [
      'currency',
      'latin1_supplemental',
      'latin1',
      'latin2',
      'cyrillic',
    ],
    licenseFile
  })

  const outputFileName = `${dirName}.html`
  const outputPath = path.join(outputFontDir, outputFileName)

  fs.mkdirSync(outputFontDir, { recursive: true })
  fs.writeFileSync(outputPath, html, 'utf-8')

  log(`Generated ${pc.green(outputFileName)} for ${pc.blue(familyName)}`)
}

export default generateHtmlForDir
