// Imports
// -----------------------------------------------------------------------------
// NodeJS
import path from 'node:path';
// Function
// -----------------------------------------------------------------------------
/**
 * Validates that the output directory path is acceptable relative to the input
 * directory. Returns an error message string if validation fails, or `null` if
 * the path is valid.
 *
 * Rules:
 * - Output path cannot be the same as input path
 * - Output path cannot be a subfolder of input path
 *
 * @param resolvedIn - Absolute path to the input directory
 * @param resolvedOut - Absolute path to the output directory
 * @returns Error message if invalid, `null` if valid
 */
const validateOutputPath = (resolvedIn, resolvedOut) => {
    if (resolvedOut === resolvedIn) {
        return 'Output directory cannot be the same as the input directory.';
    }
    if (resolvedOut.startsWith(resolvedIn + path.sep)) {
        return 'Output directory cannot be a subfolder of the input directory.';
    }
    return null;
};
export default validateOutputPath;
//# sourceMappingURL=validate-output-path.js.map