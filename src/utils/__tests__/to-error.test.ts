// @vitest-environment node

// Imports
// -----------------------------------------------------------------------------
// External
import { describe, expect, it } from 'vitest'

// Internal
import { toError } from '../to-error.js'

// Tests
// -----------------------------------------------------------------------------
describe('Expect toError', () => {
  it('to preserve the underlying error when Gulp wraps a task failure', () => {
    const conversionError = new Error('17 font conversions failed.')

    expect(
      toError({
        uid: 4,
        name: '<parallel>',
        branch: true,
        error: conversionError,
      }),
    ).toBe(conversionError)
  })

  it('to preserve a message when a non-Error value contains one', () => {
    expect(toError({ message: 'conversion failed' }).message).toBe(
      'conversion failed',
    )
  })
})
