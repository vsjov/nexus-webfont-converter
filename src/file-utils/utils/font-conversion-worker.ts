// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'

// Internal
import { convertFontToWoff } from './convert-font-to-woff.js'
import { convertFontToWoff2 } from './convert-font-to-woff2.js'
import { loadNativeWoff2Converter } from './load-native-woff2-converter.js'
import { sendWorkerMessage } from './send-worker-message.js'
import { waitForParentDisconnect } from './wait-for-parent-disconnect.js'

// Worker
// -----------------------------------------------------------------------------
// Runs as a forked child process rather than a worker thread: the native
// ttf2woff2 addon is not context-aware and can be loaded by only one thread
// per process, so each conversion needs its own process to stay on the fast
// native path. The task payload arrives as JSON in the first argument and
// results are reported over the IPC channel. The parent disconnects the channel
// after receiving every expected result so process exit cannot overtake the
// final message event.
if (!process.send) process.exit(1)

const sendToParent = process.send.bind(process)

type WorkerOutput = {
  outputPath: string
  format: 'woff' | 'woff2'
}

const payload = JSON.parse(process.argv[2] ?? '{}') as {
  inputPath: string
  outputs?: WorkerOutput[]
}

const outputs: WorkerOutput[] = payload.outputs ?? []

/**
 * Checks whether WOFF2 conversion is about to use the slow WASM fallback
 * without the user explicitly requesting it.
 *
 * @returns `true` when the native addon is unavailable and WASM was not requested
 */
const isUnintentionalWasmFallback = (): boolean =>
  process.env['TTF2WOFF2_VERSION']?.toLowerCase() !== 'wasm' &&
  loadNativeWoff2Converter() === null

try {
  const inputBuffer = await fs.promises.readFile(payload.inputPath)

  for (const output of outputs) {
    await sendWorkerMessage({ status: { format: output.format } }, sendToParent)

    try {
      if (output.format === 'woff') {
        await convertFontToWoff(
          payload.inputPath,
          output.outputPath,
          inputBuffer,
        )
      } else {
        await convertFontToWoff2(
          payload.inputPath,
          output.outputPath,
          inputBuffer,
        )
      }

      await sendWorkerMessage(
        {
          result: {
            format: output.format,
            success: true,
            ...(output.format === 'woff2' && isUnintentionalWasmFallback()
              ? { usedWasmFallback: true }
              : {}),
          },
        },
        sendToParent,
      )
    } catch (err) {
      await sendWorkerMessage(
        {
          result: {
            format: output.format,
            success: false,
            error: (err as Error).message,
          },
        },
        sendToParent,
      )
    }
  }
} catch (err) {
  await sendWorkerMessage(
    {
      results: outputs.map(output => ({
        format: output.format,
        success: false,
        error: (err as Error).message,
      })),
    },
    sendToParent,
  )
}

await waitForParentDisconnect(process)
