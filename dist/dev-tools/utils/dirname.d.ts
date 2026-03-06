import type { URL } from 'node:url';
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
export declare const _dirname: (fileLocation: URL | string) => string;
export default _dirname;
//# sourceMappingURL=dirname.d.ts.map