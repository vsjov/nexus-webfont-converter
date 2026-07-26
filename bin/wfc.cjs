#!/usr/bin/env node

'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')
const { spawnSync } = require('node:child_process')

const requireFromHere = createRequire(__filename)
const PACKAGE_ROOT = path.resolve(__dirname, '..')
const NATIVE_FLAG = '--native'

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
const findInstalledNativeBinary = (
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
 * Locates a Rust binary built from a source checkout.
 *
 * @param {NodeJS.Platform} platform - Node platform identifier.
 * @param {string} packageRoot - Package root containing the Cargo target directory.
 * @param {(filePath: string) => boolean} exists - File existence check.
 * @returns {string | undefined} Locally built native executable path when present.
 */
const findDevelopmentNativeBinary = (
  platform = process.platform,
  packageRoot = PACKAGE_ROOT,
  exists = fs.existsSync,
) => {
  const binaryName = platform === 'win32' ? 'wfc.exe' : 'wfc'
  const candidates = [
    path.join(packageRoot, 'target', 'release', binaryName),
    path.join(packageRoot, 'target', 'debug', binaryName),
  ]

  return candidates.find(exists)
}

/**
 * Locates an installed native executable or a binary built in a source checkout.
 *
 * @param {NodeJS.Platform} platform - Node platform identifier.
 * @param {string} architecture - Node CPU architecture identifier.
 * @param {(name: string) => string} resolve - Package resolver.
 * @param {(filePath: string) => boolean} exists - File existence check.
 * @param {string} packageRoot - Package root containing the Cargo target directory.
 * @returns {string | undefined} Native executable path when available.
 */
const findNativeBinary = (
  platform = process.platform,
  architecture = process.arch,
  resolve = requireFromHere.resolve,
  exists = fs.existsSync,
  packageRoot = PACKAGE_ROOT,
) =>
  findInstalledNativeBinary(platform, architecture, resolve, exists) ||
  findDevelopmentNativeBinary(platform, packageRoot, exists)

/**
 * Separates the wrapper-only native flag from arguments forwarded to an engine.
 *
 * @param {string[]} args - CLI arguments after the executable name.
 * @returns {{ engine: 'native' | 'node', forwardedArgs: string[] }} Selected engine and forwarded arguments.
 */
const selectEngine = args => {
  const engine = args.includes(NATIVE_FLAG) ? 'native' : 'node'

  return {
    engine,
    forwardedArgs: args.filter(arg => arg !== NATIVE_FLAG),
  }
}

/**
 * Runs the existing Node CLI by default or the native CLI when `--native` is
 * requested. Native mode never falls back to Node, so comparisons remain valid.
 *
 * @param {string[]} args - CLI arguments after the executable name.
 * @param {string | null | undefined} nativeBinary - Available native executable path.
 * @param {(command: string, args: string[], options: object) => import('node:child_process').SpawnSyncReturns<Buffer>} spawn - Synchronous process launcher.
 * @returns {number} CLI exit status.
 */
const runWfc = (args, nativeBinary, spawn = spawnSync) => {
  const { engine, forwardedArgs } = selectEngine(args)
  const resolvedNativeBinary =
    engine === 'native' && nativeBinary === undefined
      ? findNativeBinary()
      : nativeBinary

  if (engine === 'native' && !resolvedNativeBinary) {
    process.stderr.write(
      'Error: native wfc is unavailable. Build it with "npm run build:native" or install a matching native package.\n',
    )
    return 1
  }

  const command = engine === 'native' ? resolvedNativeBinary : process.execPath
  const commandArgs =
    engine === 'native'
      ? forwardedArgs
      : [path.join(PACKAGE_ROOT, 'dist', 'cli', 'cli.js'), ...forwardedArgs]
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

module.exports = {
  findDevelopmentNativeBinary,
  findInstalledNativeBinary,
  findNativeBinary,
  getNativePackageName,
  runWfc,
  selectEngine,
}
