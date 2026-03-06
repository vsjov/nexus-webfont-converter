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
declare const validateOutputPath: (resolvedIn: string, resolvedOut: string) => string | null;
export default validateOutputPath;
//# sourceMappingURL=validate-output-path.d.ts.map