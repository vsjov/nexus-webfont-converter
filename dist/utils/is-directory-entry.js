// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs';
import path from 'node:path';
// Functions
// -----------------------------------------------------------------------------
/**
 * Checks whether a directory entry is a subdirectory.
 *
 * @param dirPath - Parent directory path
 * @param entry - Directory entry to inspect
 * @returns `true` when the entry is a directory
 */
export const isDirectoryEntry = (dirPath, entry) => {
    if (typeof entry !== 'string')
        return entry.isDirectory();
    try {
        return fs.statSync(path.join(dirPath, entry)).isDirectory();
    }
    catch {
        return false;
    }
};
export default isDirectoryEntry;
//# sourceMappingURL=is-directory-entry.js.map