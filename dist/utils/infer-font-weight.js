// Imports
// -----------------------------------------------------------------------------
// Internal
import { WEIGHT_MAP } from '../config/constants.js';
// Function
// -----------------------------------------------------------------------------
/**
 * Infers the CSS font-weight value from a font filename.
 * Returns 400 (Regular) as the fallback when no keyword is matched.
 *
 * @example
 * inferFontWeight('DMSans-Bold')         // → 700
 * inferFontWeight('Roboto-ExtraLight')   // → 200
 */
export const inferFontWeight = (fileName) => {
    for (const [pattern, weight] of WEIGHT_MAP) {
        if (pattern.test(fileName))
            return weight;
    }
    return 400;
};
export default inferFontWeight;
//# sourceMappingURL=infer-font-weight.js.map