// @vitest-environment node

// Imports
// -----------------------------------------------------------------------------
// NodeJS
import { EventEmitter } from 'node:events'

// External
import { describe, expect, it } from 'vitest'

// Internal
import { waitForParentDisconnect } from '../wait-for-parent-disconnect.js'

// Tests
// -----------------------------------------------------------------------------
describe('Expect waitForParentDisconnect', () => {
  it('to keep waiting when the parent IPC channel remains connected', async () => {
    const ipcChannel = Object.assign(new EventEmitter(), { connected: true })
    let isResolved = false
    const pendingDisconnect = waitForParentDisconnect(ipcChannel).then(() => {
      isResolved = true
    })

    await Promise.resolve()

    expect(isResolved).toBe(false)

    ipcChannel.connected = false
    ipcChannel.emit('disconnect')
    await pendingDisconnect

    expect(isResolved).toBe(true)
  })

  it('to resolve immediately when the parent already disconnected', async () => {
    const ipcChannel = Object.assign(new EventEmitter(), { connected: false })

    await expect(waitForParentDisconnect(ipcChannel)).resolves.toBeUndefined()
  })
})
