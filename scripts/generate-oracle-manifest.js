#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const repositoryRoot = path.resolve(import.meta.dirname, '..')
const manifestPath = path.join(
  repositoryRoot,
  'tests/compatibility/typescript-oracle-manifest.json',
)
const isVerification = process.argv.includes('--verify')
const temporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'nexus-wfc-oracle-'),
)
const inputDir = path.join(temporaryRoot, 'input')
const outputDir = path.join(temporaryRoot, 'output')

try {
  fs.cpSync(path.join(repositoryRoot, 'fonts-sample/input'), inputDir, {
    recursive: true,
  })

  const conversionResult = runCli(['--in', inputDir, '--out', outputDir])
  const manifest = {
    schemaVersion: 1,
    conversion: { exitCode: conversionResult.exitCode },
    sourceFonts: listFiles(inputDir).filter(file => isSourceFont(file.path)),
    artifacts: listFiles(outputDir),
    scenarios: {
      help: runCli(['--help']),
      version: runCli(['--version']),
      unknownFlag: runCli(['--unknown']),
      missingOutput: runCli(['--in', inputDir]),
      nestedOutput: runCli([
        '--in',
        inputDir,
        '--out',
        path.join(inputDir, 'output'),
      ]),
      maintenanceInputNotice: runCli([
        '--in',
        inputDir,
        '--out',
        outputDir,
        '--compile-css',
      ]),
    },
  }
  const serializedManifest = `${JSON.stringify(manifest, null, 2)}\n`

  if (isVerification) {
    const expectedManifest = fs.readFileSync(manifestPath, 'utf8')

    if (serializedManifest !== expectedManifest) {
      throw new Error(
        `TypeScript oracle changed. Review and regenerate ${path.relative(repositoryRoot, manifestPath)}.`,
      )
    }
  } else {
    fs.writeFileSync(manifestPath, serializedManifest)
  }
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true })
}

/**
 * Invokes the built TypeScript CLI with colors disabled and normalized paths.
 *
 * @param {string[]} args CLI arguments after the executable path.
 * @returns {{ exitCode: number | null, stderr: string, stdout: string }}
 */
function runCli(args) {
  const result = spawnSync(process.execPath, ['dist/cli/cli.js', ...args], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
  })

  return {
    exitCode: result.status,
    stderr: normalizeOutput(result.stderr),
    stdout: normalizeOutput(result.stdout),
  }
}

/**
 * Lists files below a directory in deterministic relative-path order.
 *
 * @param {string} root Directory to scan.
 * @returns {Array<Record<string, unknown>>} File manifest entries.
 */
function listFiles(root) {
  if (!fs.existsSync(root)) return []

  return fs
    .readdirSync(root, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => {
      const relativePath = entry.parentPath
        ? path.relative(root, path.join(entry.parentPath, entry.name))
        : entry.name
      const buffer = fs.readFileSync(path.join(root, relativePath))
      const extension = path.extname(relativePath).toLowerCase()
      const isSource = isSourceFont(relativePath)
      const isFont = extension === '.woff' || extension === '.woff2'

      return {
        path: relativePath.split(path.sep).join('/'),
        type: isSource ? 'source-font' : isFont ? 'font' : 'text-or-license',
        byteLength: buffer.length,
        ...(isSource
          ? sourceFontDetails(buffer)
          : artifactDetails(buffer, extension)),
      }
    })
    .sort((left, right) => String(left.path).localeCompare(String(right.path)))
}

/**
 * Describes source-font SFNT tables for differential codec checks.
 *
 * @param {Buffer} buffer Source font bytes.
 * @returns {Record<string, unknown>} Source font details.
 */
function sourceFontDetails(buffer) {
  return {
    sha256: createHash('sha256').update(buffer).digest('hex'),
    sfntTables: parseSfntDirectory(buffer),
  }
}

/**
 * Describes a generated artifact without treating compressed font bytes as stable.
 *
 * @param {Buffer} buffer Artifact bytes.
 * @param {string} extension Lowercase file extension.
 * @returns {Record<string, unknown>} Artifact details.
 */
function artifactDetails(buffer, extension) {
  if (extension === '.woff') {
    return {
      signature: buffer.subarray(0, 4).toString('ascii'),
      woffTables: parseWoffDirectory(buffer),
    }
  }
  if (extension === '.woff2') {
    return {
      signature: buffer.subarray(0, 4).toString('ascii'),
      numberOfTables: buffer.readUInt16BE(12),
    }
  }

  return { sha256: createHash('sha256').update(buffer).digest('hex') }
}

/**
 * Parses the SFNT table directory required for codec compatibility checks.
 *
 * @param {Buffer} buffer SFNT source bytes.
 * @returns {Array<{ checksum: number, tag: string }>} Sorted table entries.
 */
function parseSfntDirectory(buffer) {
  const numberOfTables = buffer.readUInt16BE(4)

  return Array.from({ length: numberOfTables }, (_, index) => {
    const offset = 12 + index * 16

    return {
      tag: buffer.subarray(offset, offset + 4).toString('ascii'),
      checksum: buffer.readUInt32BE(offset + 4),
    }
  })
}

/**
 * Parses the WOFF1 table directory required for codec compatibility checks.
 *
 * @param {Buffer} buffer WOFF1 bytes.
 * @returns {Array<{ checksum: number, tag: string }>} Sorted table entries.
 */
function parseWoffDirectory(buffer) {
  const numberOfTables = buffer.readUInt16BE(12)

  return Array.from({ length: numberOfTables }, (_, index) => {
    const offset = 44 + index * 20

    return {
      tag: buffer.subarray(offset, offset + 4).toString('ascii'),
      checksum: buffer.readUInt32BE(offset + 16),
    }
  })
}

/**
 * Returns whether a source manifest entry has a supported font extension.
 *
 * @param {string} filePath Relative source file path.
 * @returns {boolean} Whether the entry is a source font.
 */
function isSourceFont(filePath) {
  return ['.ttf', '.otf'].includes(path.extname(filePath).toLowerCase())
}

/**
 * Removes terminal escape sequences and temporary-root paths from CLI output.
 *
 * @param {string | undefined} output Process output.
 * @returns {string} Stable output suitable for a checked-in manifest.
 */
function normalizeOutput(output) {
  return (output ?? '')
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
    .replaceAll(temporaryRoot, '<TEMP>')
    .replaceAll('\\', '/')
}
