// @vitest-environment node

// Imports
// -----------------------------------------------------------------------------
// External
import { describe, expect, it, vi } from 'vitest'

// Internal
import { sendWorkerMessage } from '../send-worker-message.js'

// Tests
// -----------------------------------------------------------------------------
describe('Expect sendWorkerMessage', () => {
  it('to remain pending when the IPC callback has not completed', async () => {
    let completeSend: ((error: Error | null) => void) | undefined
    const send = vi.fn((_message, callback) => {
      completeSend = callback

      return false
    })
    let isResolved = false
    const pendingSend = sendWorkerMessage({ result: 'ok' }, send).then(() => {
      isResolved = true
    })

    await Promise.resolve()

    expect(isResolved).toBe(false)

    completeSend?.(null)
    await pendingSend

    expect(isResolved).toBe(true)
  })

  it('to reject when the IPC callback reports an error', async () => {
    const sendError = new Error('IPC channel closed')
    const send = vi.fn((_message, callback) => {
      callback(sendError)

      return false
    })

    await expect(sendWorkerMessage({ result: 'failed' }, send)).rejects.toThrow(
      sendError,
    )
  })
})
