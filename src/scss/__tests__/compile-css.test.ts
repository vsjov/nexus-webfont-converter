// @vitest-environment node

// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// External
import { afterEach, describe, expect, it } from 'vitest'

// Internal
import { compileCssFiles } from '../compile-css.js'

// Tests
// -----------------------------------------------------------------------------
describe('Expect compileCssFiles', () => {
  const tempDirs: string[] = []

  afterEach(() => {
    for (const tempDir of tempDirs) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }

    tempDirs.length = 0
  })

  describe('to emit an error', () => {
    it('when a SCSS file cannot be compiled', async () => {
      const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'nexus-webfont-converter-'),
      )
      tempDirs.push(tempDir)
      fs.writeFileSync(
        path.join(tempDir, 'broken.scss'),
        '.broken { color: ; }',
      )

      await expect(
        new Promise<void>((resolve, reject) => {
          compileCssFiles(tempDir)
            .on('end', resolve)
            .on('error', (err: Error) => reject(err))
        }),
      ).rejects.toThrow()
    })
  })
})
