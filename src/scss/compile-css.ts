// Imports
// -----------------------------------------------------------------------------
// External
import browserslist from 'browserslist'
import gulp from 'gulp'
// @ts-expect-error - No type declarations available
import gulpSass from 'gulp-sass'
import { browserslistToTargets } from 'lightningcss'
import * as sassCompiler from 'sass'
import rename from 'gulp-rename'
// @ts-expect-error - No type declarations available
import lightningcss from 'gulp-lightningcss'

// Internal
import type { ParsedPath } from 'gulp-rename'
import type { Transform } from 'node:stream'

// Setup
// -----------------------------------------------------------------------------
const sass = gulpSass(sassCompiler)

// Helpers
// -----------------------------------------------------------------------------
/**
 * Forwards stream errors to the returned output stream so callers can handle
 * failures from any stage in the SCSS compilation chain.
 *
 * @param sourceStream - Stream that may emit an error
 * @param outputStream - Stream returned to callers
 */
const forwardStreamError = (
  sourceStream: NodeJS.ReadWriteStream,
  outputStream: NodeJS.ReadWriteStream,
): void => {
  sourceStream.on('error', (err: unknown) => {
    outputStream.emit(
      'error',
      err instanceof Error ? err : new Error(String(err)),
    )
  })
}

// Functions
// -----------------------------------------------------------------------------
/**
 * Compiles all SCSS files found in the given output directory to minified CSS.
 * Output files are written alongside the source SCSS files with a `.css`
 * extension.
 *
 * @param outputDir - The directory containing generated `.scss` files.
 * @returns Stream that emits `end` on success or `error` on compilation failure
 */
export const compileCssFiles = (outputDir: string) => {
  const sourceStream = gulp.src(`${outputDir}/**/*.scss`, { base: outputDir })
  const sassStream = sass() as Transform
  const lightningcssStream = lightningcss({
    minify: true,
    sourceMap: false,
    targets: browserslistToTargets(
      browserslist(undefined, { path: outputDir }),
    ),
  }) as Transform
  const renameStream = rename((path: ParsedPath) => {
    path.extname = '.css'
  }) as Transform
  const outputStream = sourceStream
    .pipe(sassStream)
    .pipe(lightningcssStream)
    .pipe(renameStream)
    .pipe(gulp.dest(outputDir))

  for (const stream of [
    sourceStream,
    sassStream,
    lightningcssStream,
    renameStream,
  ]) {
    forwardStreamError(stream, outputStream)
  }

  return outputStream
}
