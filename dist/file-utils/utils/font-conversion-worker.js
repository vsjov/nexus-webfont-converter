// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs';
import { workerData, parentPort } from 'node:worker_threads';
// Internal
import { convertFontToWoff } from './convert-font-to-woff.js';
import { convertFontToWoff2 } from './convert-font-to-woff2.js';
// Worker
// -----------------------------------------------------------------------------
if (!parentPort)
    process.exit(1);
const payload = workerData;
const outputs = payload.outputs ??
    (payload.outputPath && payload.format
        ? [
            {
                outputPath: payload.outputPath,
                format: payload.format,
            },
        ]
        : []);
try {
    const inputBuffer = await fs.promises.readFile(payload.inputPath);
    for (const output of outputs) {
        parentPort.postMessage({ status: { format: output.format } });
        try {
            if (output.format === 'woff') {
                await convertFontToWoff(payload.inputPath, output.outputPath, inputBuffer);
            }
            else {
                await convertFontToWoff2(payload.inputPath, output.outputPath, inputBuffer);
            }
            parentPort.postMessage({
                result: { format: output.format, success: true },
            });
        }
        catch (err) {
            parentPort.postMessage({
                result: {
                    format: output.format,
                    success: false,
                    error: err.message,
                },
            });
        }
    }
}
catch (err) {
    parentPort.postMessage({
        results: outputs.map(output => ({
            format: output.format,
            success: false,
            error: err.message,
        })),
    });
}
//# sourceMappingURL=font-conversion-worker.js.map