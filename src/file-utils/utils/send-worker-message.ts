// Types
// -----------------------------------------------------------------------------
type WorkerMessage = string | object | number | boolean | bigint

type WorkerMessageSender = (
  message: WorkerMessage,
  callback: (error: Error | null) => void,
) => boolean

// Function
// -----------------------------------------------------------------------------
/**
 * Sends a child-process IPC message and waits until Node.js confirms delivery.
 *
 * @param message - Serializable IPC payload to send to the parent process
 * @param send - Bound `process.send` implementation
 * @returns Resolves after the IPC send callback completes
 * @throws {Error} When the IPC channel cannot deliver the message
 */
export const sendWorkerMessage = (
  message: WorkerMessage,
  send: WorkerMessageSender,
): Promise<void> =>
  new Promise((resolve, reject) => {
    send(message, error => {
      if (error) {
        reject(error)

        return
      }

      resolve()
    })
  })

export default sendWorkerMessage
