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

## What it does
Given a directory of **TTF** or **OTF** source fonts, the converter:

1. **Converts** each font file to WOFF and WOFF2 formats using a multicore
   worker thread pool (one thread per logical CPU core) - fonts are processed in
   parallel and progress is logged in real-time as each file completes
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
       font conversion uses a worker thread pool (one thread per CPU core)
       progress is logged in real-time as each file completes
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

#### CLI Options

| Flag     | Description                                                              |
|----------|:-------------------------------------------------------------------------|
| `--in`   | Path to the directory containing TTF/OTF files (required for conversion) |
| `--out`  | Path to the output directory (required)                                  |
| `--help` | Show help message                                                        |

> **Note:** The `--out` directory cannot be empty, the same as `--in`, or a
> subfolder of `--in`. If it doesn't exist, it will be created automatically.

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

## Credits
This project would not be possible without the following open source libraries:
- [ttf2woff](https://github.com/fontello/ttf2woff)
- [ttf2woff2](https://github.com/nfroidure/ttf2woff2)
- [gulp](https://gulpjs.com/)
- [sass](https://sass-lang.com/)
- [vitest](https://vitest.dev/)
- [typescript](https://www.typescriptlang.org/)
- [eslint](https://eslint.org/)

Author: [Vladimir Jovanović (vsjov)](https://github.com/vsjov/)