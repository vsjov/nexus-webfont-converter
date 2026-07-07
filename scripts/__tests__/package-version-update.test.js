// Imports
// -----------------------------------------------------------------------------
// NodeJS
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// External
import { describe, expect, test } from 'vitest'

// Internal
import {
  bumpVersion,
  resolveNextVersion,
  updatePackageVersion,
} from '../package-version-update.js'

// Functions
// -----------------------------------------------------------------------------
/**
 * Creates a temporary package root with package and shrinkwrap metadata.
 *
 * @returns {string} Temporary package root.
 */
const createPackageRoot = () => {
  const rootDir = mkdtempSync(
    path.join(os.tmpdir(), 'nexus-webfont-converter-version-update-'),
  )

  writeFileSync(
    path.join(rootDir, 'package.json'),
    `${JSON.stringify(
      {
        name: 'nexus-webfont-converter',
        version: '1.2.3',
      },
      null,
      2,
    )}\n`,
  )
  writeFileSync(
    path.join(rootDir, 'npm-shrinkwrap.json'),
    `${JSON.stringify(
      {
        name: 'nexus-webfont-converter',
        version: '1.2.3',
        packages: {
          '': {
            name: 'nexus-webfont-converter',
            version: '1.2.3',
          },
        },
      },
      null,
      2,
    )}\n`,
  )

  return rootDir
}

/**
 * Reads JSON from a temporary package root.
 *
 * @param {string} rootDir - Temporary package root.
 * @param {string} fileName - JSON file name.
 * @returns {Record<string, unknown>} Parsed JSON.
 */
const readJson = (rootDir, fileName) =>
  JSON.parse(readFileSync(path.join(rootDir, fileName), 'utf8'))

// Tests
// -----------------------------------------------------------------------------
describe('Expect package version update helper', () => {
  test('to bump semantic versions by release type', () => {
    expect(bumpVersion('1.2.3', 'major')).toBe('2.0.0')
    expect(bumpVersion('1.2.3', 'minor')).toBe('1.3.0')
    expect(bumpVersion('1.2.3', 'patch')).toBe('1.2.4')
  })

  test('to resolve exact versions and bump types', () => {
    expect(resolveNextVersion('1.2.3', '2.0.0')).toBe('2.0.0')
    expect(resolveNextVersion('1.2.3', 'patch')).toBe('1.2.4')
  })

  test('to update package and shrinkwrap root versions', () => {
    const rootDir = createPackageRoot()
    const summary = updatePackageVersion(rootDir, '2.0.0')
    const pkg = readJson(rootDir, 'package.json')
    const shrinkwrap = readJson(rootDir, 'npm-shrinkwrap.json')

    expect(summary).toEqual({
      currentVersion: '1.2.3',
      nextVersion: '2.0.0',
      packageName: 'nexus-webfont-converter',
    })
    expect(pkg.version).toBe('2.0.0')
    expect(shrinkwrap.version).toBe('2.0.0')
    expect(shrinkwrap.packages[''].version).toBe('2.0.0')
  })
})
