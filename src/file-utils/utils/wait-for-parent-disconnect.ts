// Types
// -----------------------------------------------------------------------------
type WorkerIpcChannel = {
  connected: boolean
  once: (event: 'disconnect', listener: () => void) => unknown
}

// Function
// -----------------------------------------------------------------------------
/**
 * Keeps a forked worker alive until its parent closes the IPC channel.
 *
 * Registering a `disconnect` listener references Node.js's initially
 * unreferenced child IPC channel. The parent therefore has time to handle the
 * worker's final result before allowing the child to exit.
 *
 * @param ipcChannel - Child-process IPC state and event source
 * @returns Resolves after the parent disconnects, or immediately if disconnected
 */
export const waitForParentDisconnect = async (
  ipcChannel: WorkerIpcChannel,
): Promise<void> => {
  if (!ipcChannel.connected) return

  await new Promise<void>(resolve => {
    ipcChannel.once('disconnect', resolve)
  })
}

export default waitForParentDisconnect
