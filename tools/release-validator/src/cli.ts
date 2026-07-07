#!/usr/bin/env node

// Imports
// -----------------------------------------------------------------------------
// NodeJS
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Internal
import { createCommandRunner } from './create-command-runner.js'
import { validateReleaseTag } from './validate-release-tag.js'

// Constants
// -----------------------------------------------------------------------------
const CURRENT_FILE = fileURLToPath(import.meta.url)
const PACKAGE_ROOT = path.resolve(path.dirname(CURRENT_FILE), '../../..')

// Functions
// -----------------------------------------------------------------------------
/**
 * Runs the guarded release-tag validation CLI.
 *
 * @param args - CLI arguments containing the pushed tag name.
 * @returns Nothing.
 * @throws When the tag argument is missing or release validation fails.
 */
export const runReleaseValidatorCli = (
  args: string[] = process.argv.slice(2),
): void => {
  const tagName = args[0]

  if (!tagName) {
    throw new Error('Usage: npm run validate:release-tag -- vX.Y.Z')
  }

  const validation = validateReleaseTag({
    packageRoot: PACKAGE_ROOT,
    runCommand: createCommandRunner(PACKAGE_ROOT),
    tagName,
  })

  console.log(
    `Validated ${validation.tagName} at ${validation.tagCommit} on origin/release/${validation.version}`,
  )
}

// Main
// -----------------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === CURRENT_FILE) {
  try {
    runReleaseValidatorCli()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

export default runReleaseValidatorCli
