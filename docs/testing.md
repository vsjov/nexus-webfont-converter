# Testing Guide

This guide covers the current Rust implementation, the Node.js compatibility
suite, and npm wrapper behavior.

## Native CLI Smoke Test

Convert any source directory with the Rust CLI:

```bash
cargo run -p nexus-webfont-cli -- --in ./fonts/source --out ./fonts/web
```

The input directory may use either a flat layout or one directory per font
family. Each `.ttf` and `.otf` source font is eligible for conversion; license
files are copied independently and never control whether a font is converted.

## Committed Fixture Test

Run the native pipeline against the committed TrueType and CFF OpenType sample
fonts:

```bash
rm -rf /tmp/wfc-output
cargo run -p nexus-webfont-cli -- --in ./fonts-sample/input --out /tmp/wfc-output
```

The output contains, per family:

```text
family/
  family-regular.woff
  family-regular.woff2
  family.scss
  family.css
  family.html
  LICENSE
```

The exact font file bytes can differ from Node output because compression
backends differ. Container signatures, decoded font structure, generated text,
and copied license contents are covered by compatibility tests.

## Maintenance Commands

Use an existing output directory for each maintenance mode:

```bash
cargo run -p nexus-webfont-cli -- --out /tmp/wfc-output --compile-css
cargo run -p nexus-webfont-cli -- --out /tmp/wfc-output --recompile-html
cargo run -p nexus-webfont-cli -- --out /tmp/wfc-output --remove-unused
cargo run -p nexus-webfont-cli -- --out /tmp/wfc-output --sync
```

`--sync` runs CSS compilation, preview regeneration, then unused-font removal.
Maintenance flags ignore `--in` and require an existing `--out` directory.

## Full Verification

Run every local quality gate before accepting Rust changes:

```bash
cargo fmt --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace --all-features
cargo deny check
npm test
npm run test:rust-compat
```

`npm run test:rust-compat` runs the codec compatibility tests and checks the
current TypeScript oracle manifest. It does not compare compressed webfont bytes
directly.

## npm Wrapper Test

The npm wrapper runs the existing compiled Node.js CLI by default. Build the
native source-checkout binary, then request it explicitly with `--native`:

```bash
npm run build
npm link
npm run build:native
wfc --in ./fonts-sample/input --out /tmp/wfc-node-output
wfc --native --in ./fonts-sample/input --out /tmp/wfc-rust-output
```

The native build command uses Cargo's release profile, which is required for a
meaningful performance comparison.

Use separate output directories for comparisons. When a matching optional
native package is installed, `bin/wfc.cjs --native` delegates to its `wfc`
executable. If native mode cannot find an executable, it fails instead of
falling back to Node.js. Run the wrapper unit test with:

```bash
npm run test:wrapper
```

## Current Platform Limitation

On Windows, a filesystem-level replacement of an existing output can be
rejected by the standard library. In that case conversion reports an error and
preserves the existing output. Normal full-pipeline runs clean the output first.
