[![CI](https://github.com/vsjov/nexus-webfont-converter/actions/workflows/main.yml/badge.svg)](https://github.com/vsjov/nexus-webfont-converter/actions/workflows/main.yml)
![Node.js](https://img.shields.io/node/v/nexus-webfont-converter)

# Nexus Webfont Converter [![GitHub release](https://img.shields.io/github/v/release/vsjov/nexus-webfont-converter)](https://github.com/vsjov/nexus-webfont-converter/releases/latest)
Standalone converter for **TTF** and **OTF** font files to **WOFF** and
**WOFF2** formats.

## Installation

**From npm (recommended):**
```bash
npm install -g nexus-webfont-converter
```

**From source:**
Ensure that you have [supported](./.nvmrc) NodeJS installed, then:
```bash
npm start
npm install -g .
```

After that, the `wfc` command will be available in your terminal. Run `wfc
--help` to see usage instructions.

### Rust migration commands

The Rust reimplementation is developed alongside the Node.js implementation.
When a platform-specific native package is available, the npm `wfc` wrapper
uses it automatically; otherwise it runs the existing Node.js CLI. See the
[Rust CLI migration guide](./docs/rust-migration.md) for the current support
matrix, release process, and publication prerequisites. To verify the Rust
workspace, install the pinned toolchain from `rust-toolchain.toml` and run:

```bash
cargo fmt --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace --all-features
npm run test:rust-compat
```

## What it does
Given a directory of **TTF** or **OTF** source fonts, the converter:

1. **Converts** each font file to WOFF and WOFF2 formats using forked child
   processes (one process per source font, up to the available CPU
   parallelism) so every parallel conversion can use the fast native
   ttf2woff2 addon - fonts are
   processed in parallel and progress is logged in real-time as each output
   completes
2. **Normalizes** output filenames to lowercase hyphenated form
   (`DMSans-BoldItalic.ttf` -> `dm-sans-bold-italic.woff2`)
3. **Copies** license files (`.txt`, `.md`, `.pdf`, or files without extension)
   from input to output
4. **Generates** a `[font-name].scss` file with a `@font-face` mixin and
   `@include` calls for each variant, with inferred `font-weight` and
   `font-style`
5. **Compiles** the SCSS to a minified `[font-name].css`
6. **Generates** a `[font-name].html` font preview page that shows all variants
   across multiple character sets, with missing glyph detection

The pipeline runs:

```
clean output
  -> convert fonts (WOFF + WOFF2) + copy licenses  [parallel]
       font conversion uses child processes up to available CPU parallelism
       progress is logged in real-time as each output completes
  -> generate SCSS
  -> compile CSS
  -> generate HTML preview
```

## Usage

### CLI

After installing, run:

```bash
wfc --in ./fonts/source --out ./fonts/web
```

## Directory structure
If you want to use this directly from the repository, place source fonts inside
`build/in/`, organized in one subdirectory per font family:

```
build/
  in/
    dm-sans/
      DMSans-Regular.ttf
      DMSans-Italic.ttf
      DMSans-Medium.ttf
      DMSans-MediumItalic.ttf
      DMSans-Bold.ttf
      DMSans-BoldItalic.ttf
      OFL.txt              <- license file (optional, {.txt,.md,.pdf, no ext})
  out/
    .gitkeep
```

Then run `npm run convert` to convert all fonts in `build/in/` to `build/out/`.

The output mirrors the input structure:

```
build/
  out/
    dm-sans/
      dm-sans-regular.woff
      dm-sans-regular.woff2
      dm-sans-bold.woff
      dm-sans-bold.woff2
      ...
      dm-sans.scss         <- generated @font-face SCSS
      dm-sans.css          <- compiled and minified CSS
      dm-sans.html         <- font preview page
      OFL.txt              <- copied license
```

Additional commands:
- `npm run compile-css`: Re-compiles all `.scss` files in the output directory
  to minified CSS.
- `npm run recompile-html`: Re-generates all `[font-name].html` preview pages
  from the current `@include` entries in each `.scss` file.
- `npm run remove-unused`: Deletes `.woff` and `.woff2` files from the output
  directory whose base name does not appear in any `@include fontFace(...)` call
  in the corresponding `.scss` file.
- `npm run sync`: Runs `compile-css`, `recompile-html`, and `remove-unused` in
  sequence.
- `npm run test:sample-fonts`: Builds the package and runs a full conversion
  verification against the committed `fonts-sample/input/` fixture. This is
  intentionally separate from the default test suite because the Ubuntu Mono
  Nerd Font sample makes WOFF2 compression comparatively slow.
- `npm run benchmark:fonts`: Builds the package, converts the same sample
  fixture, and prints timing plus source-font throughput. Sample command output
  is written to `fonts-sample/output`.

#### CLI Options

| Flag     | Description                                                              |
|----------|:-------------------------------------------------------------------------|
| `--in`   | Path to the directory containing TTF/OTF files (required for conversion) |
| `--out`  | Path to the output directory (required)                                  |
| `--help` | Show help message                                                        |

> **Note:** The `--out` directory cannot be empty, the same as `--in`, or a
> subfolder of `--in`. The input directory also cannot be inside the output
> directory. If `--out` doesn't exist, it will be created automatically.

```bash
wfc --in ./fonts/source --out ./fonts/web
```

| Maintenance flags  | Description                                                               |
|--------------------|:--------------------------------------------------------------------------|
| `--compile-css`    | Compile SCSS to minified CSS in the output directory                      |
| `--recompile-html` | Re-generate HTML preview pages from existing SCSS entries                 |
| `--remove-unused`  | Delete `.woff`/`.woff2` files not referenced in the SCSS                  |
| `--sync`           | Run `--compile-css`, `--recompile-html` and `--remove-unused` in sequence |

> **Note:** The maintenance flags (`--compile-css`, `--recompile-html`,
> `--remove-unused`, `--sync`) only require `--out` - no `--in` needed.

```bash
wfc --out ./fonts/web --compile-css
wfc --out ./fonts/web --recompile-html
wfc --out ./fonts/web --remove-unused
wfc --out ./fonts/web --sync
```

If any font conversion fails, the command prints warnings for the failed
outputs and exits with a non-zero status instead of silently continuing.

## Output files
| File                | Description                                            |
|---------------------|:-------------------------------------------------------|
| `[variant].woff`    | WOFF format font file                                  |
| `[variant].woff2`   | WOFF2 format font file                                 |
| `[font-name].scss`  | SCSS with `@mixin fontFace` and `@include` per variant |
| `[font-name].css`   | Compiled and minified CSS ready for use                |
| `[font-name].html`  | Browser-viewable font preview                          |
| `*.{txt,md,pdf,''}` | License files copied as-is from input directory        |


## Font weight inference
Weights are inferred automatically from the filename:

| Keyword                      | Weight |
|:-----------------------------|:------:|
| Thin                         |  100   |
| ExtraLight / UltraLight      |  200   |
| Light                        |  300   |
| **Regular** / none specified |  400   |
| Medium                       |  500   |
| SemiBold / DemiBold          |  600   |
| **Bold**                     |  700   |
| ExtraBold / UltraBold        |  800   |
| Black / Heavy                |  900   |

`Italic` and `Oblique` in the filename both set `font-style: italic`. All other
variants default to `normal`.

> **Note:** Inference is heuristic and covers the most common naming
> conventions.  Unusual naming patterns may not be detected correctly. Always
> review the generated `[font-name].html` and `[font-name].scss` before
> deploying.

## WOFF2 performance

WOFF2 compression is CPU-intensive, especially for fonts with extended
character sets such as Nerd Fonts. The converter prefers the native ttf2woff2
addon, which is roughly 2.4x faster than the WASM fallback (measured 8.9s vs
21.3s for a 2.3 MB Nerd Font). Conversions run in child processes so every
parallel conversion can load the native addon. If the native addon cannot be
loaded (for example when the addon build failed during install), the converter
falls back to WASM and reports a warning in the conversion summary. Set
`TTF2WOFF2_VERSION=native` or `TTF2WOFF2_VERSION=wasm` to force a specific
converter.

## OTF support

The converter accepts both TrueType-flavored fonts and CFF-outline OTF fonts.
The test suite includes a CFF-outline OTF fixture and verifies that it produces
non-empty WOFF and WOFF2 output with the expected webfont signatures. Always
review the generated HTML preview in your target browser before shipping a font
family, especially when using unusual or vendor-specific OTF files.

## Programmatic API

The package exports the full pipeline for Node.js consumers:

```ts
import { runPipeline } from 'nexus-webfont-converter'

await runPipeline('/absolute/path/to/source-fonts', '/absolute/path/to/web-fonts')
```

Lower-level helpers such as `convertFontsInDir`, `convertFontToWoff`,
`convertFontToWoff2`, `generateFontFaceScss`, `compileCssFiles`, and
`generateFontPreviewHtml` are also exported for custom workflows.

## Manual adjustments

If the inferred values are wrong, edit the `.scss` file manually and use the
following maintenance flags to apply your changes without re-running the full
conversion pipeline.

### Recompile CSS

```bash
wfc --out ./fonts/web --compile-css
```

Recompiles all `.scss` files in the output directory to minified CSS.

### Regenerate HTML preview

```bash
wfc --out ./fonts/web --recompile-html
```

Re-generates all `[font-name].html` preview pages from the current `@include`
entries in each `.scss` file.

### Remove unused font files

```bash
wfc --out ./fonts/web --remove-unused
```

Deletes `.woff` and `.woff2` files from the output directory whose base name
does not appear in any `@include fontFace(...)` call in the corresponding
`.scss` file.

### Sync all

```bash
wfc --out ./fonts/web --sync
```

Runs `--compile-css`, `--recompile-html`, and `--remove-unused` in sequence.

### Testing

Run unit tests with:

```bash
npm run test
```

### Repository scripts

For Nexus Webfont Converter development:

```bash
npm run format:check
npm run format
npm run lint
npm run lint:fix
npm run test
npm run build
npm run build-all
```

- `npm run format:check` checks repository formatting with Oxfmt
- `npm run format` formats repository files with Oxfmt
- `npm run lint` checks source files with Oxlint
- `npm run lint:fix` applies safe Oxlint fixes
- `npm run test` runs the source Vitest suite
- `npm run build` compiles package output into `dist/`
- `npm run build-all` runs formatting checks, linting, tests, builds, and package checks

## Credits
This project would not be possible without the following open source libraries:
- [ttf2woff](https://github.com/fontello/ttf2woff)
- [ttf2woff2](https://github.com/nfroidure/ttf2woff2)
- [gulp](https://gulpjs.com/)
- [sass](https://sass-lang.com/)
- [vitest](https://vitest.dev/)
- [typescript](https://www.typescriptlang.org/)
- [oxlint](https://oxc.rs/docs/guide/usage/linter.html)
- [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html)

Author: [Vladimir Jovanović (vsjov)](https://github.com/vsjov/)
