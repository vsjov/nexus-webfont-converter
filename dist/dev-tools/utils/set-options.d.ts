export type FunctionParameters = {
    [key: string | number]: unknown;
};
/**
 * Sets the options for a function, using the defaults and the parameters passed
 * to the function.
 * - If a parameter is not passed, the default value will be used.
 * - If a parameter is passed that is not in the defaults, it will be ignored,
 *   but a warning will be logged to the console.
 *
 * @param defaults - Default parameters (all required fields)
 * @param [parameters] - Parameters to add to function (optional fields)
 * @returns Returns an object with all parameters properly set, typed as the defaults type
 *
 * @example
 * ```typescript
 * type MyDefaults = {
 *   foo: string,
 *   bar: number
 * }
 *
 * const myTestFunction = (parameters?: Partial<MyDefaults>) => {
 *   const DEFAULTS: MyDefaults = {
 *     foo: 'default',
 *     bar: 42
 *   }
 *
 *   const OPTIONS = setOptions(DEFAULTS, parameters)
 *   // OPTIONS is now typed as MyDefaults (all fields required)
 *
 *   return OPTIONS
 * }
 *
 * myTestFunction({ foo: 'foo', nonExistent: 'baz' })
 * ```
 *
 * Returns:
 * ```json
 * {
 *   foo: 'foo',
 *   bar: 42
 * }
 * ```
 */
export declare const setOptions: <T extends FunctionParameters>(defaults: T, parameters?: Partial<T>) => T;
export default setOptions;
//# sourceMappingURL=set-options.d.ts.map