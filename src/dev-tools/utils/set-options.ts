// Types
// -----------------------------------------------------------------------------
export type FunctionParameters = { [key: string | number]: unknown }

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
export const setOptions = <T extends FunctionParameters>(
  defaults: T,
  parameters?: Partial<T>
): T => {
  if (!parameters) { return defaults }

  const updatedObject = {} as T
  const dKeys = Object.keys(defaults) as Array<keyof T>

  for (let i = 0; i < dKeys.length; i++) {
    const key = dKeys[i]

    if (key in parameters) {
      updatedObject[key] = parameters[key]!
    } else if (key in defaults) {
      updatedObject[key] = defaults[key]
    } else {
      console.warn(`Ignoring unknown parameter: ${String(key)}`)
    }
  }

  return updatedObject
}

export default setOptions
