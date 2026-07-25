// @vitest-environment node

import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it, vi } from 'vitest'

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { findNativeBinary, getNativePackageName, runWfc } = require(
  path.resolve(CURRENT_DIR, '../../bin/wfc.cjs'),
)

describe('Expect native wfc wrapper', () => {
  it('to name the target-specific optional package', () => {
    expect(getNativePackageName('linux', 'x64')).toBe(
      'nexus-webfont-converter-linux-x64',
    )
    expect(getNativePackageName('win32', 'arm64')).toBe(
      'nexus-webfont-converter-win32-arm64',
    )
  })

  it('to resolve the native executable from an installed target package', () => {
    const resolve = vi.fn(
      () => '/node_modules/nexus-webfont-converter-linux-x64/package.json',
    )
    const exists = vi.fn(() => true)

    expect(findNativeBinary('linux', 'x64', resolve, exists)).toBe(
      '/node_modules/nexus-webfont-converter-linux-x64/bin/wfc',
    )
    expect(resolve).toHaveBeenCalledWith(
      'nexus-webfont-converter-linux-x64/package.json',
    )
  })

  it('to run an installed native binary with the original arguments', () => {
    const spawn = vi.fn(() => ({ status: 0 }))

    expect(runWfc(['--version'], '/native/wfc', spawn)).toBe(0)
    expect(spawn).toHaveBeenCalledWith('/native/wfc', ['--version'], {
      stdio: 'inherit',
    })
  })

  it('to fall back to the compiled Node CLI when no native binary is installed', () => {
    const spawn = vi.fn(() => ({ status: 0 }))

    expect(runWfc(['--help'], undefined, spawn)).toBe(0)
    expect(spawn).toHaveBeenCalledWith(
      process.execPath,
      [expect.stringMatching(/dist\/cli\/cli\.js$/), '--help'],
      { stdio: 'inherit' },
    )
  })
})
