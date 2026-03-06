// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// External
import { afterAll, describe, expect, it } from 'vitest'

// Internal
import { convertFontToWoff2 } from '../convert-font-to-woff2.js'


// Paths
// -----------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MOCKS_DIR = path.join(__dirname, '__mocks__')
const OUTPUT_DIR = path.join(__dirname, '__output__')

const TTF_FIXTURE = path.join(MOCKS_DIR, 'teko-bold.ttf')
const OTF_FIXTURE = path.join(MOCKS_DIR, 'public-sans-thin.otf')


// Cleanup
// -----------------------------------------------------------------------------
afterAll(() => {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true })
})


// Tests
// -----------------------------------------------------------------------------
describe('Expect convertFontToWoff2', () => {
  describe('to produce a valid WOFF2 file', () => {
    it('when converting a TTF font', () => {
      const outputPath = path.join(OUTPUT_DIR, 'teko-bold.woff2')

      convertFontToWoff2(TTF_FIXTURE, outputPath)

      const output = fs.readFileSync(outputPath)

      expect(output.length).toBeGreaterThan(0)
      // WOFF2 magic number: 0x774F4632 ("wOF2")
      expect(output[0]).toBe(0x77)
      expect(output[1]).toBe(0x4f)
      expect(output[2]).toBe(0x46)
      expect(output[3]).toBe(0x32)
    })

    it('when converting an OTF font', () => {
      const outputPath = path.join(OUTPUT_DIR, 'public-sans-thin.woff2')

      convertFontToWoff2(OTF_FIXTURE, outputPath)

      const output = fs.readFileSync(outputPath)

      expect(output.length).toBeGreaterThan(0)
      expect(output[0]).toBe(0x77)
      expect(output[1]).toBe(0x4f)
    })
  })

  describe('to create the output directory recursively', () => {
    it('when the output directory does not exist', () => {
      const outputPath = path.join(OUTPUT_DIR, 'nested', 'dir', 'font.woff2')

      convertFontToWoff2(TTF_FIXTURE, outputPath)

      expect(fs.existsSync(outputPath)).toBe(true)
    })
  })

  describe('to produce a file smaller than the source', () => {
    it('when compressing a TTF to WOFF2', () => {
      const outputPath = path.join(OUTPUT_DIR, 'size-check.woff2')

      convertFontToWoff2(TTF_FIXTURE, outputPath)

      const inputSize = fs.statSync(TTF_FIXTURE).size
      const outputSize = fs.statSync(outputPath).size

      expect(outputSize).toBeLessThan(inputSize)
    })
  })
})
