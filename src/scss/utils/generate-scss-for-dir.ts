// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import path from 'node:path'

// External
import pc from 'picocolors'

// Internal
import { SOURCE_EXTENSIONS } from '../../config/constants.js'
import { inferFontFamilyName } from '../../utils/infer-font-family-name.js'
import { buildFontEntries } from '../../utils/build-font-entries.js'
import { includeComment } from './include-comment.js'
import { templateFontFaceMixin } from './template-font-face-mixin.js'

// Types
import type { ProgressOptions } from '../../utils/progress.js'


// Constants
// -----------------------------------------------------------------------------
/** Priority-ordered list of web font formats to include in src */
const FORMAT_PRIORITY = ['.woff2', '.woff', '.ttf', '.otf']


// Function
// -----------------------------------------------------------------------------
/**
 * Generates a `[font-name].scss` file for a single font family directory.
 *
 * @param fontDir - Directory containing the source font files (TTF / OTF)
 * @param outputFontDir - Directory where the `.scss` file will be written
 * @param dirName - Directory basename used to derive the font family name and output filename
 */
export const generateScssForDir = (
  fontDir: string,
  outputFontDir: string,
  dirName: string,
  progress: ProgressOptions = {}
): void => {
  const { onProgress, onWarn } = progress

  const entries = fs.readdirSync(fontDir)
  const fontFiles = entries.filter(f => SOURCE_EXTENSIONS.includes(path.extname(f).toLowerCase()))

  if (fontFiles.length === 0) {
    onWarn?.(`No TTF or OTF files found in ${pc.blue(fontDir)} - skipping SCSS generation`)

    return
  }

  // Detect which formats are present in the output directory
  const outputEntries = fs.existsSync(outputFontDir)
    ? fs.readdirSync(outputFontDir)
    : []

  const detectedFormats = FORMAT_PRIORITY.filter(ext =>
    outputEntries.some(f => path.extname(f).toLowerCase() === ext)
  )

  if (detectedFormats.length === 0) {
    onWarn?.(`No converted font files found in ${pc.blue(outputFontDir)} - skipping SCSS generation`)

    return
  }

  const familyName = inferFontFamilyName(dirName)

  const fontEntries = buildFontEntries(fontFiles)

  const includeLines = fontEntries.map(entry =>
    `// ${includeComment(entry.weight, entry.style)}\n` +
    `@include fontFace("${familyName}", "${entry.normalizedBase}", ${entry.weight}, "${entry.style}");`
  ).join('\n')

  const scss = `${templateFontFaceMixin(detectedFormats)}\n\n${includeLines}\n`
  const outputFileName = `${dirName}.scss`
  const outputPath = path.join(outputFontDir, outputFileName)

  fs.mkdirSync(outputFontDir, { recursive: true })
  fs.writeFileSync(outputPath, scss, 'utf-8')

  onProgress?.(`Generated ${pc.green(outputFileName)} for ${pc.blue(familyName)} (${fontEntries.length} variants)`)
}

export default generateScssForDir
