#!/usr/bin/env node

// Imports
// -----------------------------------------------------------------------------
// NodeJS
import { readFileSync, writeFileSync } from 'node:fs'
import { stdin as input, stdout as output } from 'node:process'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Constants
// -----------------------------------------------------------------------------
const CURRENT_FILE = fileURLToPath(import.meta.url)
const CURRENT_DIR = path.dirname(CURRENT_FILE)
const PACKAGE_ROOT = path.resolve(CURRENT_DIR, '..')
const PACKAGE_JSON_FILE = 'package.json'
const SHRINKWRAP_FILE = 'npm-shrinkwrap.json'
const BUMP_TYPES = ['major', 'minor', 'patch']
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/

// Functions
// -----------------------------------------------------------------------------
/**
 * Reads and parses a JSON file from the package root.
 *
 * @param {string} rootDir - Package root directory.
 * @param {string} fileName - JSON file name.
 * @returns {Record<string, unknown>} Parsed JSON object.
 * @throws {SyntaxError} When the JSON file cannot be parsed.
 */
const readJsonFile = (rootDir, fileName) =>
  JSON.parse(readFileSync(path.join(rootDir, fileName), 'utf8'))

/**
 * Writes a JSON file with repository-standard formatting.
 *
 * @param {string} rootDir - Package root directory.
 * @param {string} fileName - JSON file name.
 * @param {Record<string, unknown>} data - JSON data to write.
 * @returns {void}
 */
const writeJsonFile = (rootDir, fileName, data) => {
  writeFileSync(
    path.join(rootDir, fileName),
    `${JSON.stringify(data, null, 2)}\n`,
  )
}

/**
 * Validates a plain semantic version.
 *
 * @param {string} version - Version string to validate.
 * @returns {string} Valid version string.
 * @throws {Error} When the version is not in `x.y.z` format.
 */
export const validateVersion = version => {
  if (!VERSION_PATTERN.test(version)) {
    throw new Error(`Invalid version "${version}". Expected format: x.y.z`)
  }

  return version
}

/**
 * Bumps a semantic version by release type.
 *
 * @param {string} currentVersion - Current semantic version.
 * @param {'major' | 'minor' | 'patch'} bumpType - Version part to bump.
 * @returns {string} Bumped semantic version.
 * @throws {Error} When the current version or bump type is invalid.
 */
export const bumpVersion = (currentVersion, bumpType) => {
  validateVersion(currentVersion)

  if (!BUMP_TYPES.includes(bumpType)) {
    throw new Error(
      `Invalid bump type "${bumpType}". Expected: ${BUMP_TYPES.join(', ')}`,
    )
  }

  const [major, minor, patch] = currentVersion.split('.').map(Number)

  if (bumpType === 'major') {
    return `${major + 1}.0.0`
  }

  if (bumpType === 'minor') {
    return `${major}.${minor + 1}.0`
  }

  return `${major}.${minor}.${patch + 1}`
}

/**
 * Resolves a version argument to an exact next version.
 *
 * @param {string} currentVersion - Current semantic version.
 * @param {string} versionArgument - Exact version or bump type.
 * @returns {string} Resolved next version.
 * @throws {Error} When the argument is neither a bump type nor a valid version.
 */
export const resolveNextVersion = (currentVersion, versionArgument) => {
  if (BUMP_TYPES.includes(versionArgument)) {
    return bumpVersion(currentVersion, versionArgument)
  }

  return validateVersion(versionArgument)
}

/**
 * Updates package and shrinkwrap version fields.
 *
 * @param {string} rootDir - Package root directory.
 * @param {string} nextVersion - Next package version.
 * @returns {{ currentVersion: string, nextVersion: string, packageName: string }} Update summary.
 * @throws {Error} When package metadata is invalid.
 */
export const updatePackageVersion = (rootDir, nextVersion) => {
  const pkg = readJsonFile(rootDir, PACKAGE_JSON_FILE)
  const currentVersion = validateVersion(String(pkg.version))
  const packageName = String(pkg.name)
  const validatedNextVersion = validateVersion(nextVersion)
  const shrinkwrap = readJsonFile(rootDir, SHRINKWRAP_FILE)

  pkg.version = validatedNextVersion
  shrinkwrap.version = validatedNextVersion

  if (shrinkwrap.packages?.['']) {
    shrinkwrap.packages[''].name = packageName
    shrinkwrap.packages[''].version = validatedNextVersion
  }

  writeJsonFile(rootDir, PACKAGE_JSON_FILE, pkg)
  writeJsonFile(rootDir, SHRINKWRAP_FILE, shrinkwrap)

  return {
    currentVersion,
    nextVersion: validatedNextVersion,
    packageName,
  }
}

/**
 * Prompts for a version argument when one was not passed.
 *
 * @param {string} currentVersion - Current package version.
 * @returns {Promise<string>} Exact version or bump type.
 */
const promptVersionArgument = async currentVersion => {
  const readline = createInterface({ input, output })

  try {
    const answer = await readline.question(
      `Next version for ${currentVersion} (major, minor, patch, or x.y.z): `,
    )

    return answer.trim()
  } finally {
    readline.close()
  }
}

/**
 * Runs the package version update CLI.
 *
 * @param {string[]} args - CLI arguments.
 * @param {string} rootDir - Package root directory.
 * @returns {Promise<void>}
 * @throws {Error} When the requested version is invalid.
 */
export const runPackageVersionUpdate = async (
  args = process.argv.slice(2),
  rootDir = PACKAGE_ROOT,
) => {
  const pkg = readJsonFile(rootDir, PACKAGE_JSON_FILE)
  const currentVersion = validateVersion(String(pkg.version))
  const versionArgument =
    args[0] ?? (await promptVersionArgument(currentVersion))
  const nextVersion = resolveNextVersion(currentVersion, versionArgument)
  const summary = updatePackageVersion(rootDir, nextVersion)

  console.log(
    `Updated ${summary.packageName} from ${summary.currentVersion} to ${summary.nextVersion}`,
  )
  console.log(`Updated ${PACKAGE_JSON_FILE} and ${SHRINKWRAP_FILE}`)
}

// Main
// -----------------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === CURRENT_FILE) {
  try {
    await runPackageVersionUpdate()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

export default runPackageVersionUpdate
