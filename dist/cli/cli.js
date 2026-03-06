#!/usr/bin/env node
// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { parseArgs } from 'node:util';
// External
import pc from 'picocolors';
// Internal
import expandTilde from './utils/expand-tilde.js';
import validateOutputPath from './utils/validate-output-path.js';
import { compileCssFiles } from '../scss/compile-css.js';
import { regenerateFontPreviewHtml } from '../html/regenerate-font-preview-html.js';
import { removeUnusedFonts } from '../file-utils/remove-unused-fonts.js';
// Version
// -----------------------------------------------------------------------------
const require = createRequire(import.meta.url);
const { version } = require('../../package.json');
// Help text
// -----------------------------------------------------------------------------
const HELP_TEXT = `
${pc.bold('wfc')} - Nexus Webfont Converter ${pc.dim(`v${version}`)}

${pc.bold('Usage:')}
  wfc --in <input-dir> --out <output-dir>
  wfc --out <output-dir> <maintenance-flag>

${pc.bold('Options:')}
  --in   ${pc.dim('Path to the directory containing TTF/OTF font files (required for conversion)')}
  --out  ${pc.dim('Path to the output directory (required)')}
         ${pc.dim('Cannot be empty, the same as --in, or a subfolder of --in.')}

${pc.bold('Maintenance flags')} ${pc.dim('(only --out required, no --in needed)')}${pc.dim(':')}
  --compile-css    ${pc.dim('Compile SCSS to minified CSS in the output directory')}
  --recompile-html ${pc.dim('Re-generate HTML preview pages from existing SCSS entries')}
  --remove-unused  ${pc.dim('Delete .woff/.woff2 files not referenced in the SCSS')}
  --sync           ${pc.dim('Run --compile-css, --recompile-html and --remove-unused in sequence')}

${pc.bold('Other:')}
  --version  ${pc.dim('Show version number')}
  --help     ${pc.dim('Show this help message')}

${pc.bold('Examples:')}
  wfc --in ./fonts/source --out ./fonts/web
  wfc --out ./fonts/web --compile-css
  wfc --out ./fonts/web --sync
`;
// Helpers
// -----------------------------------------------------------------------------
function exitWithError(message) {
    console.error(`${pc.red('Error:')} ${message}`);
    process.exit(1);
}
// Main
// -----------------------------------------------------------------------------
const main = async () => {
    const { values } = parseArgs({
        options: {
            in: { type: 'string' },
            out: { type: 'string' },
            'compile-css': { type: 'boolean', default: false },
            'recompile-html': { type: 'boolean', default: false },
            'remove-unused': { type: 'boolean', default: false },
            sync: { type: 'boolean', default: false },
            version: { type: 'boolean', default: false },
            help: { type: 'boolean', default: false },
        },
        strict: true,
    });
    if (values.version) {
        console.log(version);
        process.exit(0);
    }
    const isMaintenanceMode = values['compile-css'] ||
        values['recompile-html'] ||
        values['remove-unused'] ||
        values['sync'];
    if (values.help || (!values.in && !values.out)) {
        console.log(HELP_TEXT);
        process.exit(0);
    }
    const outArg = values.out;
    if (!outArg) {
        exitWithError('--out is required. Use --help for usage information.');
    }
    const resolvedOut = path.resolve(expandTilde(outArg));
    // Maintenance commands - only --out is needed
    if (isMaintenanceMode) {
        if (!fs.existsSync(resolvedOut) || !fs.statSync(resolvedOut).isDirectory()) {
            exitWithError(`Output directory does not exist: ${pc.blue(resolvedOut)}`);
        }
        if (values['compile-css'] || values['sync']) {
            await new Promise((resolve, reject) => {
                compileCssFiles(resolvedOut)
                    .on('end', resolve)
                    .on('error', reject);
            });
        }
        if (values['recompile-html'] || values['sync']) {
            regenerateFontPreviewHtml(resolvedOut);
        }
        if (values['remove-unused'] || values['sync']) {
            removeUnusedFonts(resolvedOut);
        }
        process.exit(0);
    }
    // Conversion mode - both --in and --out are required
    const inArg = values.in;
    if (!inArg) {
        exitWithError('--in is required. Use --help for usage information.');
    }
    const resolvedIn = path.resolve(expandTilde(inArg));
    // Validate input directory exists
    if (!fs.existsSync(resolvedIn) || !fs.statSync(resolvedIn).isDirectory()) {
        exitWithError(`Input directory does not exist: ${pc.blue(resolvedIn)}`);
    }
    // Validate output path against input path
    const outputError = validateOutputPath(resolvedIn, resolvedOut);
    if (outputError) {
        exitWithError(outputError);
    }
    // Create output directory if it doesn't exist
    if (!fs.existsSync(resolvedOut)) {
        fs.mkdirSync(resolvedOut, { recursive: true });
    }
    const { default: runPipeline } = await import('../run-pipeline.js');
    await runPipeline(resolvedIn, resolvedOut);
};
main().catch((err) => {
    exitWithError(err.message);
});
//# sourceMappingURL=cli.js.map