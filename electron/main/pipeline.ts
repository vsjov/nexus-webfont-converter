import fs from 'node:fs'
import path from 'node:path'
import { join, dirname, basename, extname } from 'node:path'

import { deleteAsync } from 'del'
// @ts-expect-error - no type declarations
import ttf2woff from 'ttf2woff'
import ttf2woff2 from 'ttf2woff2'

import { SOURCE_EXTENSIONS } from '../../src/config/constants.js'
import { toHyphenated } from '../../src/utils/to-hyphenated.js'
import { copyLicenseFiles } from '../../src/file-utils/copy-license-files.js'
import { generateFontFaceScss } from '../../src/scss/generate-font-face-scss.js'
import { compileCssFiles } from '../../src/scss/compile-css.js'
import { generateFontPreviewHtml } from '../../src/html/generate-font-preview-html.js'


// Helpers
// -----------------------------------------------------------------------------
const yieldToMain = (): Promise<void> => new Promise(resolve => setImmediate(resolve))

const convertFont = (inputPath: string, outputPath: string, format: 'woff' | 'woff2'): void => {
  const input = fs.readFileSync(inputPath)
  const output: Buffer = format === 'woff'
    ? (ttf2woff(input) as Buffer)
    : (ttf2woff2(input) as Buffer)

  fs.mkdirSync(dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, output)
}

const scanFontFiles = (dirPath: string): string[] => {
  const entries = fs.readdirSync(dirPath, { recursive: true, encoding: 'utf-8' })
  return entries.filter(e => SOURCE_EXTENSIONS.includes(extname(e).toLowerCase()))
}

const compileCssPromise = (outputDir: string): Promise<void> =>
  new Promise((resolve, reject) => {
    compileCssFiles(outputDir)
      .on('end', resolve)
      .on('error', reject)
  })


// Exports
// -----------------------------------------------------------------------------
export const countSteps = (inputDir: string): number => {
  const N = scanFontFiles(inputDir).length
  // clean + N*2 conversions + copy licenses + generate SCSS + compile CSS + generate HTML
  return N * 2 + 5
}

export const runElectronPipeline = async (
  inputDir: string,
  outputDir: string,
  onStep: (step: string) => void
): Promise<void> => {
  // 1. Clean output directory
  await deleteAsync([
    join(outputDir, '**', '*'),
    `!${join(outputDir, '.gitkeep')}`,
  ], { force: true, dot: true })
  onStep('Cleaned output directory')

  // 2. Convert fonts (woff + woff2 per file)
  const fontFiles = scanFontFiles(inputDir)

  for (const relPath of fontFiles) {
    const inputPath = path.join(inputDir, relPath)
    const normalizedBase = toHyphenated(basename(relPath, extname(relPath)))
    const outputSubDir = join(outputDir, dirname(relPath))

    for (const format of ['woff', 'woff2'] as const) {
      await yieldToMain()
      convertFont(inputPath, join(outputSubDir, `${normalizedBase}.${format}`), format)
      onStep(`Converted ${basename(relPath)} → ${format}`)
    }
  }

  // 3. Copy license files
  copyLicenseFiles(inputDir, outputDir)
  onStep('Copied license files')

  // 4. Generate SCSS
  generateFontFaceScss(inputDir, outputDir)
  onStep('Generated SCSS')

  // 5. Compile CSS
  await compileCssPromise(outputDir)
  onStep('Compiled CSS')

  // 6. Generate HTML preview
  generateFontPreviewHtml(inputDir, outputDir)
  onStep('Generated HTML preview')
}
