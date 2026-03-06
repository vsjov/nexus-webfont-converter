# Nexus Webfont Converter
Standalone converter for TTF and OTF font files to WOFF and WOFF2 formats.

## What it does
Given a directory of TTF or OTF source fonts, the converter:

1. **Converts** each font file to WOFF and WOFF2 formats
2. **Normalizes** output filenames to lowercase hyphenated form
   (`DMSans-BoldItalic.ttf` → `dm-sans-bold-italic.woff2`)
3. **Copies** license files (`.txt` or files without extension) from input to
   output
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
      OFL.txt              ← license file (optional)
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
      dm-sans.scss         ← generated @font-face SCSS
      dm-sans.css          ← compiled and minified CSS
      dm-sans.html         ← font preview page
      OFL.txt              ← copied license
```


## Usage
Use this command to convert fonts after placing them in the `build/in/`
directory:

```bash
npm run convert
```

This builds the TypeScript source first, then runs the Gulp pipeline:

```
clean output
  → convert fonts (WOFF + WOFF2) + copy licenses  [parallel]
  → generate SCSS
  → compile CSS
  → generate HTML preview
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

`Italic` in the filename sets `font-style: italic`. All other variants default
to `normal`.

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