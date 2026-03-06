// Imports
// -----------------------------------------------------------------------------
// External
import gulp from 'gulp';
// @ts-expect-error - No type declarations available
import gulpSass from 'gulp-sass';
import * as sassCompiler from 'sass';
import rename from 'gulp-rename';
// @ts-expect-error - No type declarations available
import lightningcss from 'gulp-lightningcss';
// Setup
// -----------------------------------------------------------------------------
const sass = gulpSass(sassCompiler);
// Functions
// -----------------------------------------------------------------------------
/**
 * Compiles all SCSS files found in the given output directory to minified CSS.
 * Output files are written alongside the source SCSS files with a `.css`
 * extension.
 *
 * @param outputDir - The directory containing generated `.scss` files.
 */
export const compileCssFiles = (outputDir) => {
    return gulp.src(`${outputDir}/**/*.scss`, { base: outputDir })
        .pipe(sass().on('error', sass.logError))
        .pipe(lightningcss({ minify: true, sourceMap: false }))
        .pipe(rename((path) => {
        path.extname = '.css';
    }))
        .pipe(gulp.dest(outputDir));
};
//# sourceMappingURL=compile-css.js.map