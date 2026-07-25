#!/usr/bin/env node

'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')
const { spawnSync } = require('node:child_process')

const requireFromHere = createRequire(__filename)
const PACKAGE_ROOT = path.resolve(__dirname, '..')

/**
 * Returns the optional package that contains a binary for a Node platform.
 *
 * @param {NodeJS.Platform} platform - Node platform identifier.
 * @param {string} architecture - Node CPU architecture identifier.
 * @returns {string} Target-specific optional package name.
 */
const getNativePackageName = (
  platform = process.platform,
  architecture = process.arch,
) => `nexus-webfont-converter-${platform}-${architecture}`

/**
 * Locates the executable provided by the matching optional native package.
 *
 * @param {NodeJS.Platform} platform - Node platform identifier.
 * @param {string} architecture - Node CPU architecture identifier.
 * @param {(name: string) => string} resolve - Package resolver.
 * @param {(filePath: string) => boolean} exists - File existence check.
 * @returns {string | undefined} Native executable path when installed.
 */
const findNativeBinary = (
  platform = process.platform,
  architecture = process.arch,
  resolve = requireFromHere.resolve,
  exists = fs.existsSync,
) => {
  try {
    const packageJson = resolve(
      `${getNativePackageName(platform, architecture)}/package.json`,
    )
    const executable = path.join(
      path.dirname(packageJson),
      'bin',
      platform === 'win32' ? 'wfc.exe' : 'wfc',
    )

    return exists(executable) ? executable : undefined
  } catch {
    return undefined
  }
}

/**
 * Runs the native CLI when its optional package is installed, otherwise the
 * existing compiled Node CLI.
 *
 * @param {string[]} args - CLI arguments after the executable name.
 * @param {string | undefined} nativeBinary - Installed native executable path.
 * @param {(command: string, args: string[], options: object) => import('node:child_process').SpawnSyncReturns<Buffer>} spawn - Synchronous process launcher.
 * @returns {number} CLI exit status.
 */
const runWfc = (args, nativeBinary = findNativeBinary(), spawn = spawnSync) => {
  const command = nativeBinary || process.execPath
  const commandArgs = nativeBinary
    ? args
    : [path.join(PACKAGE_ROOT, 'dist', 'cli', 'cli.js'), ...args]
  const result = spawn(command, commandArgs, { stdio: 'inherit' })

  if (result.error) {
    process.stderr.write(
      `Error: unable to start wfc: ${result.error.message}\n`,
    )
    return 1
  }

  return result.status === null ? 1 : result.status
}

if (require.main === module) {
  process.exitCode = runWfc(process.argv.slice(2))
}

module.exports = { findNativeBinary, getNativePackageName, runWfc }
