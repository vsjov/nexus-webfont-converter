// Imports
// -----------------------------------------------------------------------------
// External
import { describe, expect, it } from 'vitest'

// Internal
import {
  canShowWorkerRowsForTerminal,
  formatElapsedDuration,
  formatWorkerSlot,
} from '../progress.js'

describe('Expect progress formatting', () => {
  describe('to reserve worker slot width', () => {
    it('when the configured pool has two-digit worker identifiers', () => {
      expect(formatWorkerSlot(1, 32)).toBe(' 1')
      expect(formatWorkerSlot(32, 32)).toBe('32')
    })

    it('when the configured pool has one or three-digit worker identifiers', () => {
      expect(formatWorkerSlot(1, 1)).toBe('1')
      expect(formatWorkerSlot(9, 128)).toBe('  9')
      expect(formatWorkerSlot(128, 128)).toBe('128')
    })
  })

  describe('to limit worker rows to the terminal height', () => {
    it('when the full table does not fit', () => {
      expect(canShowWorkerRowsForTerminal(32, true, 32)).toBe(false)
      expect(canShowWorkerRowsForTerminal(32, true, 33)).toBe(true)
      expect(canShowWorkerRowsForTerminal(32, false, 100)).toBe(false)
    })
  })

  describe('to format elapsed duration', () => {
    it('when elapsed time is measured in seconds', () => {
      expect(formatElapsedDuration(1)).toBe('    1s')
      expect(formatElapsedDuration(12)).toBe('   12s')
    })

    it('when elapsed time is measured in minutes, hours, or days', () => {
      expect(formatElapsedDuration(90)).toBe('  1,5m')
      expect(formatElapsedDuration(60 * 60)).toBe('    1h')
      expect(formatElapsedDuration(90 * 60)).toBe('  1,5h')
      expect(formatElapsedDuration(24 * 60 * 60)).toBe('    1d')
      expect(formatElapsedDuration(36 * 60 * 60)).toBe('  1,5d')
    })
  })
})
