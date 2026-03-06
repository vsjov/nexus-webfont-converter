// Imports
// -----------------------------------------------------------------------------
// NodeJS
import os from 'node:os'
import path from 'node:path'

// External
import { describe, expect, it } from 'vitest'

// Internal
import expandTilde from '../expand-tilde.js'


// Tests
// -----------------------------------------------------------------------------
describe('Expect expandTilde', () => {
  const home = os.homedir()

  describe('to expand tilde to home directory', () => {
    it('when path starts with ~/', () => {
      expect(expandTilde('~/fonts/source')).toBe(path.join(home, 'fonts/source'))
    })

    it('when path is just ~', () => {
      expect(expandTilde('~')).toBe(home)
    })

    it('when path starts with ~ followed by a subdirectory', () => {
      expect(expandTilde('~/a/b/c')).toBe(path.join(home, 'a/b/c'))
    })
  })

  describe('to return path unchanged', () => {
    it('when path is absolute', () => {
      expect(expandTilde('/absolute/path')).toBe('/absolute/path')
    })

    it('when path is relative', () => {
      expect(expandTilde('./relative/path')).toBe('./relative/path')
    })

    it('when path contains tilde in the middle', () => {
      expect(expandTilde('/some/~path')).toBe('/some/~path')
    })

    it('when path is empty', () => {
      expect(expandTilde('')).toBe('')
    })
  })
})
