// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import path from 'node:path'

// External
import log from 'fancy-log'
import pc from 'picocolors'

// Internal
import { buildFontTargets } from '../utils/build-font-targets.js'
import { parseScssEntries } from '../html/utils/parse-scss-entries.js'


// Constants
// -----------------------------------------------------------------------------
const WEB_FONT_EXTENSIONS = ['.woff', '.woff2']


// Function
// -----------------------------------------------------------------------------
/**
 * Removes web font files (`.woff`, `.woff2`) from each font family
 * subdirectory of `outputDir` that are no longer referenced by the
 * corresponding `[font-name].scss` file.
 *
 * Font files whose basename (without extension) does not match any
 * `$fileName` argument in an `@include fontFace(...)` call in the SCSS are
 * considered unused and deleted.
 *
 * Subdirectories without a `.scss` file are skipped entirely.
 *
 * @param outputDir - Root output directory containing per-family subdirectories
 *                    (e.g. `build/out/`)
 *
 * @example
 * ```ts
 * removeUnusedFonts('./build/out')
 * // -> deletes build/out/dm-sans/dm-sans-medium.woff if dm-sans.scss has no
 * //   @include that references "dm-sans-medium"
 * ```
 */
export const removeUnusedFonts = (outputDir: string): void => {
  const targets = buildFontTargets(outputDir)

  if (targets.length === 0) {
    log(pc.yellow(`No font subdirectories found in ${pc.blue(outputDir)}`))

    return
  }

  for (const { outputFontDir, dirName } of targets) {
    const scssPath = path.join(outputFontDir, `${dirName}.scss`)

    if (!fs.existsSync(scssPath)) {
      log(pc.yellow(`No SCSS file found in ${pc.blue(outputFontDir)} - skipping`))
      continue
    }

    const scssContent = fs.readFileSync(scssPath, 'utf-8')

    const referencedBases = new Set(
      parseScssEntries(scssContent).map(e => e.normalizedBase)
    )

    const fontFiles = fs.readdirSync(outputFontDir).filter(f =>
      WEB_FONT_EXTENSIONS.includes(path.extname(f).toLowerCase())
    )

    for (const file of fontFiles) {
      const base = path.basename(file, path.extname(file))

      if (!referencedBases.has(base)) {
        fs.unlinkSync(path.join(outputFontDir, file))
        log(`Removed unused font ${pc.red(file)} from ${pc.blue(dirName)}`)
      }
    }
  }
}

export default removeUnusedFonts
