# Rust CLI Migration

The Rust workspace is the future implementation of the `wfc` command. The npm
package remains compatible with the existing Node.js CLI while the native
implementation is validated and distributed.

## Current behavior

The npm `wfc` entrypoint first looks for the installed target package matching
the current Node.js platform and CPU architecture:

| Platform | Architecture | Optional package |
|----------|--------------|------------------|
| Linux | x64 | `nexus-webfont-converter-linux-x64` |
| macOS | x64 | `nexus-webfont-converter-darwin-x64` |
| macOS | arm64 | `nexus-webfont-converter-darwin-arm64` |
| Windows | x64 | `nexus-webfont-converter-win32-x64` |

When an installed target package contains `bin/wfc` (or `bin/wfc.exe` on
Windows), the wrapper runs that executable with the original arguments. If it
is absent, including on an unsupported target, the wrapper runs the compiled
Node.js CLI. This fallback preserves the published npm command while native
distribution is phased in.

The Rust CLI supports the existing conversion and maintenance flags:

```text
wfc --in <input-dir> --out <output-dir>
wfc --out <output-dir> --compile-css
wfc --out <output-dir> --recompile-html
wfc --out <output-dir> --remove-unused
wfc --out <output-dir> --sync
```

## Development checks

Use the pinned toolchain and run the Rust checks before changing native code:

```bash
cargo fmt --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace --all-features
npm run test:rust-compat
```

`npm run test:rust-compat` checks the Rust codec against the TypeScript oracle.
It does not establish complete CLI or output parity for every platform.

## Release scaffolding

Pushing a version tag builds the Rust `wfc` binary on Linux x64, macOS x64,
macOS arm64, and Windows x64. The workflow attaches the resulting binaries to
the GitHub release after the npm package is published. These assets are useful
for testing and manual installation; they are not automatically installed by
npm yet.

## Preconditions For Native npm Publication

The target packages named above do not yet exist on npm. They are deliberately
not listed in `optionalDependencies` yet, because npm cannot produce a clean
install lockfile for unpublished packages. Publishing real
cross-platform prebuilts requires all of the following:

1. Package manifests and trusted-publishing configuration for each target
   package, with versions released atomically with the main npm package.
2. A release workflow that stages each built binary in its matching package and
   publishes it before, or transactionally alongside, the wrapper package. At
   that point the main package can add the target packages as
   `optionalDependencies`.
3. Signing and distribution policy for Windows executables and macOS code
   signing/notarization, plus ownership of the required certificates.
4. Native smoke tests on every release target, including an npm install test
   that proves the wrapper resolves and executes each optional package.
5. A support policy for additional targets such as Linux arm64 and musl, and
   verification that all Rust dependencies build for each selected target.

Until those preconditions are met, the Node.js fallback remains the supported
npm execution path. Do not remove it or make native target packages mandatory.
