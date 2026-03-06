# Nexus Webfont Converter
Standalone converter for **TTF** and **OTF** font files to **WOFF** and
**WOFF2** formats.

## What it does
Given a directory of **TTF** or **OTF** source fonts, the converter:

1. **Converts** each font file to WOFF and WOFF2 formats using a multicore
   worker thread pool (one thread per logical CPU core) - fonts are processed in
   parallel and progress is logged in real-time as each file completes
2. **Normalizes** output filenames to lowercase hyphenated form
   (`DMSans-BoldItalic.ttf` -> `dm-sans-bold-italic.woff2`)
3. **Copies** license files (`.txt`, `.md`, or files without extension) from
   input to output
4. **Generates** a `[font-name].scss` file with a `@font-face` mixin and
   `@include` calls for each variant, with inferred `font-weight` and
   `font-style`
5. **Compiles** the SCSS to a minified `[font-name].css`
6. **Generates** a `[font-name].html` font preview page that shows all variants
   across multiple character sets, with missing glyph detection

## Directory structure
Place source fonts inside `build/in/`, organized in one subdirectory per font
family:

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
      OFL.txt              <- license file (optional, .txt / .md / no ext)
  out/
    .gitkeep
```

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


## Usage

### CLI (recommended)

Install globally from the project root:

```bash
npm install -g .
```

Then run:

```bash
wfc --in ./fonts/source --out ./fonts/web
```

#### Options

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

### npm script

Alternatively, place fonts in the `build/in/` directory and run:

```bash
npm run convert
```

### Pipeline

Both methods run the same pipeline:

```
clean output
  -> convert fonts (WOFF + WOFF2) + copy licenses  [parallel]
       font conversion uses a worker thread pool (one thread per CPU core)
       progress is logged in real-time as each file completes
  -> generate SCSS
  -> compile CSS
  -> generate HTML preview
```


## Output files
| File                      | Description                                            |
|---------------------------|:-------------------------------------------------------|
| `[variant].woff`          | WOFF format font file                                  |
| `[variant].woff2`         | WOFF2 format font file                                 |
| `[font-name].scss`        | SCSS with `@mixin fontFace` and `@include` per variant |
| `[font-name].css`         | Compiled and minified CSS ready for use                |
| `[font-name].html`        | Browser-viewable font preview                          |
| `LICENSE.txt` / `OFL.txt` | Copied as-is from input directory                      |


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
following commands to apply your changes without re-running the full conversion
pipeline.

### Recompile CSS

```bash
npm run compile-css
```

Recompiles all `.scss` files in `build/out/` to minified CSS.

### Regenerate HTML preview

```bash
npm run recompile-html
```

Re-generates all `[font-name].html` preview pages from the current `@include`
entries in each `.scss` file.

### Remove unused font files

```bash
npm run remove-unused
```

Deletes `.woff` and `.woff2` files from `build/out/` whose base name does not
appear in any `@include fontFace(...)` call in the corresponding `.scss` file.

### Sync all

```bash
npm run sync
```

Runs `compile-css`, `recompile-html`, and `remove-unused` in sequence.

## Testing
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