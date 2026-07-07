// Imports
// -----------------------------------------------------------------------------
// NodeJS
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// External
import { describe, expect, it } from 'vitest'

// Constants
// -----------------------------------------------------------------------------
const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url))
const PACKAGE_ROOT = path.resolve(CURRENT_DIR, '../..')
const WORKFLOW_PATH = path.join(PACKAGE_ROOT, '.github/workflows/main.yml')

// Functions
// -----------------------------------------------------------------------------
/**
 * Reads the release publish job block from the GitHub Actions workflow.
 *
 * @returns Publish job workflow text.
 * @throws {Error} When the publish job cannot be found.
 */
const readPublishJob = (): string => {
  const workflow = readFileSync(WORKFLOW_PATH, 'utf8')
  const jobStart = workflow.indexOf('  publish-npm-package:')

  if (jobStart === -1) {
    throw new Error('Release publish job was not found')
  }

  return workflow.slice(jobStart)
}

// Tests
// -----------------------------------------------------------------------------
describe('Expect release workflow', () => {
  it('to build package contents before publishing when a tag is pushed', () => {
    const publishJob = readPublishJob()

    const registryIndex = publishJob.indexOf(
      'registry-url: "https://registry.npmjs.org"',
    )

    const idTokenIndex = publishJob.indexOf('id-token: write')

    const installIndex = publishJob.indexOf('npm ci --ignore-scripts')
    const validateIndex = publishJob.indexOf('npm run validate:release-tag')
    const buildIndex = publishJob.indexOf('Build package for publish')
    const packIndex = publishJob.indexOf('npm run pack:check')

    const publishIndex = publishJob.indexOf(
      'npm publish --ignore-scripts --access public',
    )

    expect(registryIndex).toBeGreaterThan(-1)
    expect(idTokenIndex).toBeGreaterThan(-1)
    expect(publishJob).not.toContain('NODE_AUTH_TOKEN')
    expect(installIndex).toBeGreaterThan(registryIndex)
    expect(validateIndex).toBeGreaterThan(installIndex)
    expect(buildIndex).toBeGreaterThan(validateIndex)
    expect(packIndex).toBeGreaterThan(buildIndex)
    expect(publishIndex).toBeGreaterThan(packIndex)
  })
})
