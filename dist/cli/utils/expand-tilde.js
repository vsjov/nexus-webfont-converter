// Imports
// -----------------------------------------------------------------------------
// NodeJS
import os from 'node:os';
import path from 'node:path';
// Function
// -----------------------------------------------------------------------------
/**
 * Expands a leading `~` in a file path to the current user's home directory.
 * Handles both `~/path` and bare `~`. Paths without a leading tilde are
 * returned unchanged.
 *
 * @param filePath - The file path to expand
 * @returns The expanded file path
 */
const expandTilde = (filePath) => filePath.startsWith('~') ? path.join(os.homedir(), filePath.slice(1)) : filePath;
export default expandTilde;
//# sourceMappingURL=expand-tilde.js.map