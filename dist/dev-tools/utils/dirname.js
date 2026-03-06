// Imports
// -----------------------------------------------------------------------------
// NodeJS
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// Functions
// -----------------------------------------------------------------------------
/**
 * ES6 `__dirname` polyfill
 *
 * @param fileLocation - Use `import.meta.url`
 * @returns Directory path
 *
 * @example
 * import { _dirname } from 'oll-js-node'
 * const __dirname = _dirname(import.meta.url)
 */
export const _dirname = (fileLocation) => {
    return dirname(fileURLToPath(fileLocation));
};
export default _dirname;
//# sourceMappingURL=dirname.js.map