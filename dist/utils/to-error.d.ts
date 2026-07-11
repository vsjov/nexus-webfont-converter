/**
 * Normalizes an unknown rejection value while preserving wrapped task errors.
 *
 * Gulp and Undertaker emit task metadata objects whose `error` property holds
 * the original failure. Unwrapping that value prevents useful messages from
 * being reduced to `[object Object]`.
 *
 * @param value - Error, task metadata wrapper, or arbitrary rejection value
 * @returns A user-facing `Error` instance
 */
export declare const toError: (value: unknown) => Error;
export default toError;
//# sourceMappingURL=to-error.d.ts.map