// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs'
import path from 'node:path'
import { workerData, parentPort } from 'node:worker_threads'

// External
// @ts-expect-error - no type declarations available for ttf2woff
import ttf2woff from 'ttf2woff'
import ttf2woff2 from 'ttf2woff2'

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
  const inputBuffer = fs.readFileSync(payload.inputPath)
  const results = outputs.map(output => {
    try {
      const outputBuffer: Uint8Array =
        output.format === 'woff'
          ? ttf2woff(inputBuffer)
          : ttf2woff2(inputBuffer)

      fs.mkdirSync(path.dirname(output.outputPath), { recursive: true })
      fs.writeFileSync(output.outputPath, outputBuffer)

      return { format: output.format, success: true }
    } catch (err) {
      return {
        format: output.format,
        success: false,
        error: (err as Error).message,
      }
    }
  })

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
