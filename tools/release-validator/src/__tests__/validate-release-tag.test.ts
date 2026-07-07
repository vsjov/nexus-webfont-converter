// Imports
// -----------------------------------------------------------------------------
// NodeJS
import type { SpawnSyncReturns } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// External
import { afterEach, describe, expect, test, vi } from 'vitest'

// Internal
import { validateReleaseTag } from '../validate-release-tag.js'

// Types
import type { RunCommand } from '../types.js'

// Constants
// -----------------------------------------------------------------------------
const RELEASE_COMMIT = 'release-commit'
const SUCCESS_RESULT = {
  error: undefined,
  output: [],
  pid: 1,
  signal: null,
  status: 0,
  stderr: '',
  stdout: '',
} as SpawnSyncReturns<string>
const TEMPORARY_ROOTS: string[] = []

// Functions
// -----------------------------------------------------------------------------
/**
 * Creates temporary package metadata for validator tests.
 *
 * @param version - Package version to write.
 * @param name - Package name to write.
 * @returns Temporary package root.
 */
const createPackageRoot = (
  version = '1.2.3',
  name = 'nexus-webfont-converter',
): string => {
  const packageRoot = mkdtempSync(path.join(tmpdir(), 'release-validator-'))

  TEMPORARY_ROOTS.push(packageRoot)
  writeFileSync(
    path.join(packageRoot, 'package.json'),
    JSON.stringify({
      name,
      version,
    }),
  )

  return packageRoot
}

/**
 * Creates a successful Git command mock with optional output overrides.
 *
 * @param branchCommit - Remote release branch commit.
 * @param releaseTags - Tags introduced by the release branch.
 * @returns Mock command runner.
 */
const createRunCommand = (
  branchCommit = RELEASE_COMMIT,
  releaseTags = 'v1.2.3\n',
): RunCommand =>
  vi.fn<RunCommand>((command, args) => {
    if (command === 'git' && args[0] === 'rev-list') {
      return { ...SUCCESS_RESULT, stdout: `${RELEASE_COMMIT}\n` }
    }

    if (command === 'git' && args[0] === 'rev-parse') {
      return { ...SUCCESS_RESULT, stdout: `${branchCommit}\n` }
    }

    if (command === 'git' && args[0] === 'tag') {
      return { ...SUCCESS_RESULT, stdout: releaseTags }
    }

    return SUCCESS_RESULT
  })

// Tests
// -----------------------------------------------------------------------------
afterEach(() => {
  TEMPORARY_ROOTS.splice(0).forEach(temporaryRoot => {
    rmSync(temporaryRoot, { force: true, recursive: true })
  })
})

describe('Expect guarded release tag validator', () => {
  test('to validate the tag when package, branch, commit, and unique tag agree', () => {
    const packageRoot = createPackageRoot()
    const runCommand = createRunCommand()

    expect(
      validateReleaseTag({
        packageRoot,
        runCommand,
        tagName: 'v1.2.3',
      }),
    ).toEqual({
      branchRef: 'refs/remotes/origin/release/1.2.3',
      packageName: 'nexus-webfont-converter',
      tagCommit: RELEASE_COMMIT,
      tagName: 'v1.2.3',
      version: '1.2.3',
    })
    expect(runCommand).toHaveBeenCalledWith(
      'git',
      [
        'tag',
        '--merged',
        'refs/remotes/origin/release/1.2.3',
        '--no-merged',
        'refs/remotes/origin/master',
        '--list',
        'v*',
      ],
      {
        stdio: 'pipe',
      },
    )
  })

  test('to reject the tag when its format is not an exact version', () => {
    expect(() =>
      validateReleaseTag({
        packageRoot: createPackageRoot(),
        runCommand: createRunCommand(),
        tagName: 'v1.2',
      }),
    ).toThrow(/must use vX\.Y\.Z/)
  })

  test('to reject the tag when the package version differs', () => {
    expect(() =>
      validateReleaseTag({
        packageRoot: createPackageRoot('1.2.4'),
        runCommand: createRunCommand(),
        tagName: 'v1.2.3',
      }),
    ).toThrow(/does not match release tag/)
  })

  test('to reject the tag when the package name differs', () => {
    expect(() =>
      validateReleaseTag({
        packageRoot: createPackageRoot('1.2.3', 'another-package'),
        runCommand: createRunCommand(),
        tagName: 'v1.2.3',
      }),
    ).toThrow(/Release package must be nexus-webfont-converter/)
  })

  test('to reject the tag when the release branch tip differs', () => {
    expect(() =>
      validateReleaseTag({
        packageRoot: createPackageRoot(),
        runCommand: createRunCommand('another-commit'),
        tagName: 'v1.2.3',
      }),
    ).toThrow(/points at another-commit/)
  })

  test('to reject the tag when the release branch introduces consecutive tags', () => {
    expect(() =>
      validateReleaseTag({
        packageRoot: createPackageRoot(),
        runCommand: createRunCommand(RELEASE_COMMIT, 'v1.2.2\nv1.2.3\n'),
        tagName: 'v1.2.3',
      }),
    ).toThrow(/must introduce only v1\.2\.3/)
  })

  test('to reject the tag when the matching remote release branch is missing', () => {
    const runCommand = vi.fn<RunCommand>((command, args) => {
      if (command === 'git' && args[0] === 'rev-list') {
        return { ...SUCCESS_RESULT, stdout: `${RELEASE_COMMIT}\n` }
      }

      throw new Error('missing ref')
    })

    expect(() =>
      validateReleaseTag({
        packageRoot: createPackageRoot(),
        runCommand,
        tagName: 'v1.2.3',
      }),
    ).toThrow(/matching remote release branch/i)
  })
})
