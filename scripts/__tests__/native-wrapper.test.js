// @vitest-environment node

import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it, vi } from 'vitest'

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const {
  findDevelopmentNativeBinary,
  findNativeBinary,
  getNativePackageName,
  runWfc,
  selectEngine,
} = require(path.resolve(CURRENT_DIR, '../../bin/wfc.cjs'))

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

  it('to find a release binary from a source checkout', () => {
    const exists = vi.fn(
      filePath => filePath === '/workspace/target/release/wfc',
    )

    expect(findDevelopmentNativeBinary('linux', '/workspace', exists)).toBe(
      '/workspace/target/release/wfc',
    )
  })

  it('to fall back to a development binary when no target package is installed', () => {
    const resolve = vi.fn(() => {
      throw new Error('package is not installed')
    })
    const exists = vi.fn(filePath => filePath === '/workspace/target/debug/wfc')

    expect(
      findNativeBinary('linux', 'x64', resolve, exists, '/workspace'),
    ).toBe('/workspace/target/debug/wfc')
  })

  it('to select Node by default and strip the native wrapper flag', () => {
    expect(selectEngine(['--in', 'fonts/in', '--out', 'fonts/out'])).toEqual({
      engine: 'node',
      forwardedArgs: ['--in', 'fonts/in', '--out', 'fonts/out'],
    })
    expect(
      selectEngine([
        '--native',
        '--in',
        'fonts/in',
        '--out',
        'fonts/out',
        '--compile-css',
        '--recompile-html',
        '--remove-unused',
        '--sync',
      ]),
    ).toEqual({
      engine: 'native',
      forwardedArgs: [
        '--in',
        'fonts/in',
        '--out',
        'fonts/out',
        '--compile-css',
        '--recompile-html',
        '--remove-unused',
        '--sync',
      ],
    })
  })

  it('to run Node by default when a native binary is available', () => {
    const spawn = vi.fn(() => ({ status: 0 }))

    expect(runWfc(['--version'], '/native/wfc', spawn)).toBe(0)
    expect(spawn).toHaveBeenCalledWith(
      process.execPath,
      [expect.stringMatching(/dist\/cli\/cli\.js$/), '--version'],
      { stdio: 'inherit' },
    )
  })

  it('to run a native binary only when the native flag is passed', () => {
    const spawn = vi.fn(() => ({ status: 0 }))

    expect(
      runWfc(
        ['--native', '--out', '/fonts/web', '--sync'],
        '/native/wfc',
        spawn,
      ),
    ).toBe(0)
    expect(spawn).toHaveBeenCalledWith(
      '/native/wfc',
      ['--out', '/fonts/web', '--sync'],
      { stdio: 'inherit' },
    )
  })

  it('to report a missing native binary instead of falling back to Node', () => {
    const write = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true)
    const spawn = vi.fn()

    expect(runWfc(['--native', '--help'], null, spawn)).toBe(1)
    expect(write).toHaveBeenCalledWith(
      expect.stringContaining('npm run build:native'),
    )
    expect(spawn).not.toHaveBeenCalled()
  })
})
