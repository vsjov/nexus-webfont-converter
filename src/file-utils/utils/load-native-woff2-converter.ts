// Imports
// -----------------------------------------------------------------------------
// NodeJS
import { createRequire } from 'node:module'
import path from 'node:path'

// Types
// -----------------------------------------------------------------------------
export type Ttf2Woff2Converter = (input: Uint8Array) => Uint8Array

// Constants
// -----------------------------------------------------------------------------
const require = createRequire(import.meta.url)

// State
// -----------------------------------------------------------------------------
let nativeConverter: Ttf2Woff2Converter | null | undefined

// Function
// -----------------------------------------------------------------------------
/**
 * Loads the native `ttf2woff2` addon directly when it is available.
 *
 * The upstream package currently falls back to WASM when its ESM wrapper
 * cannot call the CommonJS `bindings` helper correctly. Loading the compiled
 * addon directly keeps the fast native path available while preserving the
 * package fallback for environments where native loading is not possible.
 *
 * The addon uses non-context-aware `NODE_MODULE()` registration, so it can be
 * loaded by only one thread per process. Conversion therefore runs in child
 * processes rather than worker threads, giving every parallel conversion its
 * own native addon instance.
 *
 * @returns Native converter function, or `null` when it cannot be loaded.
 */
export const loadNativeWoff2Converter = (): Ttf2Woff2Converter | null => {
  if (nativeConverter !== undefined) return nativeConverter

  try {
    const packageDir = path.dirname(require.resolve('ttf2woff2/package.json'))
    const addon = require(
      path.join(packageDir, 'build/Release/addon.node'),
    ) as {
      convert: Ttf2Woff2Converter
    }

    nativeConverter = addon.convert
  } catch {
    nativeConverter = null
  }

  return nativeConverter
}

export default loadNativeWoff2Converter
