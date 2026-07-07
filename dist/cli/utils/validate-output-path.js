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
 * - Input path cannot be a subfolder of output path
 *
 * @param resolvedIn - Absolute path to the input directory
 * @param resolvedOut - Absolute path to the output directory
 * @returns Error message if invalid, `null` if valid
 */
export const validateOutputPath = (resolvedIn, resolvedOut) => {
    if (resolvedOut === resolvedIn) {
        return 'Output directory cannot be the same as the input directory.';
    }
    if (isSubPath(resolvedIn, resolvedOut)) {
        return 'Output directory cannot be a subfolder of the input directory.';
    }
    if (isSubPath(resolvedOut, resolvedIn)) {
        return 'Input directory cannot be a subfolder of the output directory.';
    }
    return null;
};
/**
 * Checks whether `candidatePath` is contained by `parentPath`.
 *
 * @param parentPath - Absolute parent path to compare from
 * @param candidatePath - Absolute candidate path to compare against the parent
 * @returns `true` when the candidate is a nested path inside the parent
 */
const isSubPath = (parentPath, candidatePath) => {
    const relativePath = path.relative(parentPath, candidatePath);
    return (relativePath !== '' &&
        !relativePath.startsWith('..') &&
        !path.isAbsolute(relativePath));
};
export default validateOutputPath;
//# sourceMappingURL=validate-output-path.js.map