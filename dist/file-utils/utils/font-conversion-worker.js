// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs';
import path from 'node:path';
import { workerData, parentPort } from 'node:worker_threads';
// External
// @ts-expect-error - no type declarations available for ttf2woff
import ttf2woff from 'ttf2woff';
import ttf2woff2 from 'ttf2woff2';
// Worker
// -----------------------------------------------------------------------------
if (!parentPort)
    process.exit(1);
const { inputPath, outputPath, format } = workerData;
try {
    const inputBuffer = fs.readFileSync(inputPath);
    const outputBuffer = format === 'woff'
        ? ttf2woff(inputBuffer)
        : ttf2woff2(inputBuffer);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, outputBuffer);
    parentPort.postMessage({ success: true });
}
catch (err) {
    parentPort.postMessage({ success: false, error: err.message });
}
//# sourceMappingURL=font-conversion-worker.js.map