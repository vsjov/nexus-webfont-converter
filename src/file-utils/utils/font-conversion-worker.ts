// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import { workerData, parentPort } from 'node:worker_threads'

// Internal
import { convertFontToWoff } from './convert-font-to-woff.js'
import { convertFontToWoff2 } from './convert-font-to-woff2.js'

// Worker
// -----------------------------------------------------------------------------
if (!parentPort) process.exit(1)

type WorkerOutput = {
  outputPath: string
  format: 'woff' | 'woff2'
}

const payload = workerData as {
  inputPath: string
  outputPath?: string
  format?: 'woff' | 'woff2'
  outputs?: WorkerOutput[]
}

const outputs: WorkerOutput[] =
  payload.outputs ??
  (payload.outputPath && payload.format
    ? [
        {
          outputPath: payload.outputPath,
          format: payload.format,
        },
      ]
    : [])

try {
  const inputBuffer = await fs.promises.readFile(payload.inputPath)
  const results = await Promise.all(
    outputs.map(async output => {
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

        return { format: output.format, success: true }
      } catch (err) {
        return {
          format: output.format,
          success: false,
          error: (err as Error).message,
        }
      }
    }),
  )

  parentPort.postMessage({ results })
} catch (err) {
  parentPort.postMessage({
    results: outputs.map(output => ({
      format: output.format,
      success: false,
      error: (err as Error).message,
    })),
  })
}
