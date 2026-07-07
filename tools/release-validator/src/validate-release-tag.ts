// Imports
// -----------------------------------------------------------------------------
// Internal
import { readCommand } from './read-command.js'
import { readPackageMetadata } from './read-package-metadata.js'

// Types
import type {
  ReleaseTagValidation,
  ValidateReleaseTagOptions,
} from './types.js'

// Constants
// -----------------------------------------------------------------------------
const PACKAGE_NAME = 'nexus-webfont-converter'
const RELEASE_TAG_PATTERN = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/

// Functions
// -----------------------------------------------------------------------------
/**
 * Validates that one release tag identifies the exact tip of its matching remote release branch.
 *
 * @param options - Repository root, tag name, and command boundary.
 * @returns Validated release metadata.
 * @throws When the tag, package, branch, commit, or unique-tag contract is invalid.
 */
export const validateReleaseTag = (
  options: ValidateReleaseTagOptions,
): ReleaseTagValidation => {
  const versionMatch = RELEASE_TAG_PATTERN.exec(options.tagName)

  if (!versionMatch) {
    throw new Error(
      `Release tag must use vX.Y.Z without prerelease or leading-zero parts. Received: ${options.tagName}`,
    )
  }

  const version = versionMatch.slice(1).join('.')
  const packageMetadata = readPackageMetadata(options.packageRoot)

  if (packageMetadata.name !== PACKAGE_NAME) {
    throw new Error(
      `Release package must be ${PACKAGE_NAME}. Received: ${packageMetadata.name}`,
    )
  }

  if (packageMetadata.version !== version) {
    throw new Error(
      `Package version ${packageMetadata.version} does not match release tag ${options.tagName}`,
    )
  }

  const branchRef = `refs/remotes/origin/release/${version}`
  let tagCommit: string
  let branchCommit: string

  try {
    tagCommit = readCommand(options.runCommand, 'git', [
      'rev-list',
      '-n',
      '1',
      `refs/tags/${options.tagName}`,
    ])
  } catch {
    throw new Error(
      `Release tag ${options.tagName} is not available in the checkout`,
    )
  }

  try {
    branchCommit = readCommand(options.runCommand, 'git', [
      'rev-parse',
      branchRef,
    ])
  } catch {
    throw new Error(
      `Matching remote release branch origin/release/${version} does not exist`,
    )
  }

  if (tagCommit !== branchCommit) {
    throw new Error(
      `Release tag ${options.tagName} points at ${tagCommit}, but origin/release/${version} points at ${branchCommit}`,
    )
  }

  const releaseTags = readCommand(options.runCommand, 'git', [
    'tag',
    '--merged',
    branchRef,
    '--no-merged',
    'refs/remotes/origin/master',
    '--list',
    'v*',
  ])
    .split('\n')
    .filter(Boolean)

  if (releaseTags.length !== 1 || releaseTags[0] !== options.tagName) {
    throw new Error(
      `Release branch origin/release/${version} must introduce only ${options.tagName} relative to origin/master. Found: ${releaseTags.join(', ') || '(none)'}`,
    )
  }

  return {
    branchRef,
    packageName: packageMetadata.name,
    tagCommit,
    tagName: options.tagName,
    version,
  }
}

export default validateReleaseTag
