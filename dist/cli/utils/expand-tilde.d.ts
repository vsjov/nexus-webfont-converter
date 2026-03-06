/**
 * Expands a leading `~` in a file path to the current user's home directory.
 * Handles both `~/path` and bare `~`. Paths without a leading tilde are
 * returned unchanged.
 *
 * @param filePath - The file path to expand
 * @returns The expanded file path
 */
declare const expandTilde: (filePath: string) => string;
export default expandTilde;
//# sourceMappingURL=expand-tilde.d.ts.map