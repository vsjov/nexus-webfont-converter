// Imports
// -----------------------------------------------------------------------------
// External
import { describe, expect, it } from 'vitest'

// Internal
import validateOutputPath from '../validate-output-path.js'


// Tests
// -----------------------------------------------------------------------------
describe('Expect validateOutputPath', () => {
  describe('to return an error message', () => {
    it('when output path is the same as input path', () => {
      expect(validateOutputPath('/fonts/input', '/fonts/input'))
        .toBe('Output directory cannot be the same as the input directory.')
    })

    it('when output path is a direct subfolder of input path', () => {
      expect(validateOutputPath('/fonts/input', '/fonts/input/sub'))
        .toBe('Output directory cannot be a subfolder of the input directory.')
    })

    it('when output path is a deeply nested subfolder of input path', () => {
      expect(validateOutputPath('/fonts/input', '/fonts/input/a/b/c'))
        .toBe('Output directory cannot be a subfolder of the input directory.')
    })
  })

  describe('to return null', () => {
    it('when output path is completely separate from input path', () => {
      expect(validateOutputPath('/fonts/input', '/fonts/output')).toBeNull()
    })

    it('when output path is a sibling directory', () => {
      expect(validateOutputPath('/project/in', '/project/out')).toBeNull()
    })

    it('when output path shares a prefix but is not a subfolder', () => {
      expect(validateOutputPath('/fonts/input', '/fonts/input-backup')).toBeNull()
    })

    it('when output is the parent of input', () => {
      expect(validateOutputPath('/fonts/input/sub', '/fonts/input')).toBeNull()
    })
  })
})
