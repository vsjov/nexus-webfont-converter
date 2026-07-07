# Changelog

All _notable_ changes to this project will be documented in this file.

The format is based on _[Keep a Changelog][keepachangelog]_, and this project
adheres to _[Semantic Versioning][semver]._

## [Unreleased]

### Features

### Fixes

- Make font conversion failures warn clearly and fail the command.
- Prevent conversion tasks from hanging when a worker exits without a result.
- Propagate SCSS compilation errors through CLI and pipeline streams.
- Deduplicate colliding font conversion outputs and generated SCSS entries.
- Preserve `~user` paths instead of expanding them under the current home.
- Ignore directory entries that happen to use a font-file extension.
- Count only font-bearing directories in pipeline progress totals.
- Reduce conversion worker startup and source-font reads by processing all
  requested formats for each source font in one worker.
- Reuse the pipeline input-tree scan for conversion and license-copy steps.
- Reuse tested converter helpers from the worker and export the full pipeline
  API for programmatic consumers.
- Pass Browserslist targets through Lightning CSS when compiling generated CSS.
- Move `@types/cli-progress` out of runtime dependencies after verifying the
  published type surface does not expose `cli-progress` types.
- Add CLI argument-handling and pipeline orchestration coverage.
- Document non-zero conversion failures, `reset:full`, CFF-flavored OTF
  support, and the programmatic `runPipeline` API.
- Extract shared dirent/path helper utilities used by recursive scans.


## [1.1.0]

### Features
- feat: add trusted NPM release automation ([#5])
- feat: replace ESLint with Oxlint and Oxfmt ([#6])

### NPM
- npm: update npm packages ([#4])


[#4]: https://github.com/vsjov/nexus-webfont-converter/pull/4
[#5]: https://github.com/vsjov/nexus-webfont-converter/pull/5
[#6]: https://github.com/vsjov/nexus-webfont-converter/pull/6



## [1.0.2] (released: 2025-03-10)

### Features
- feat: Add .github actions and issue templates ([#1])


[#1]: https://github.com/vsjov/nexus-webfont-converter/pull/1



## [1.0.1] (released: 2025-03-10)

### Chores
- Fix version in `package.json` and `npm-shrinkwrap.json` to 1.0.1. Update NPM.
- Add changelog



## [1.0.0] (released: 2025-03-09)

### Features
- Initial release of Nexus Webfont Converter.



[Unreleased]: https://github.com/vsjov/nexus-webfont-converter/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/vsjov/nexus-webfont-converter/compare/v1.0.2...1.1.0
[1.0.2]: https://github.com/vsjov/nexus-webfont-converter/compare/v1.0.1...1.0.2
[1.0.1]: https://github.com/vsjov/nexus-webfont-converter/compare/v1.0.0...1.0.1
[1.0.0]: https://github.com/vsjov/nexus-webfont-converter/compare/ef4e633...1.0.0

[keepachangelog]: https://keepachangelog.com/en/1.0.0/
[semver]: https://semver.org/spec/v2.0.0.html
