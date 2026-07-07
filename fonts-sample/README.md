# Font Sample Fixture

This directory contains a small real-world font fixture used for optional
integration testing and benchmarking. The files are intentionally committed to
the repository but excluded from the npm package.

## Layout

```text
fonts-sample/
  input/
    akrobat/
    ubuntu-mono/
  output/      <- generated locally and ignored by Git
```

The fixture intentionally keeps two representative source fonts:

- `ubuntu-mono/UbuntuMonoNerdFont-Regular.ttf`: an extended Nerd Font with a
  large glyph set, useful for exercising slow WOFF2 compression.
- `akrobat/Akrobat-Regular.otf`: a regular OTF font, useful as a faster
  baseline.

Each sample group keeps upstream license/readme files next to the source font
so the pipeline can exercise license copying with realistic input.

## Commands

Run a full conversion check against the sample set:

```bash
npm run test:sample-fonts
```

Run the same WOFF and WOFF2 conversion and print benchmark throughput:

```bash
npm run benchmark:fonts
```

To choose formats explicitly:

```bash
node ./scripts/run-font-sample.js --verify --formats woff,woff2
node ./scripts/run-font-sample.js --benchmark --formats woff
```

Both commands write output to `fonts-sample/output` by default. To use another
temporary output directory:

```bash
FONT_SAMPLE_OUTPUT_DIR=/tmp/my-font-sample-output npm run benchmark:fonts
```
