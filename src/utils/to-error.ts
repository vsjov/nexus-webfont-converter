// Function
// -----------------------------------------------------------------------------
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
export const toError = (value: unknown): Error => {
  if (value instanceof Error) return value

  if (value && typeof value === 'object') {
    const errorRecord = value as Record<string, unknown>
    const nestedError = errorRecord['error']

    if (nestedError !== undefined && nestedError !== value) {
      return toError(nestedError)
    }

    if (typeof errorRecord['message'] === 'string') {
      return new Error(errorRecord['message'])
    }
  }

  return new Error(String(value))
}

export default toError
