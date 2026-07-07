// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs';
import path from 'node:path';
// Functions
// -----------------------------------------------------------------------------
/**
 * Checks whether a directory entry is a file.
 *
 * @param dirPath - Parent directory path
 * @param entry - Directory entry to inspect
 * @returns `true` when the entry is a file
 */
export const isFileEntry = (dirPath, entry) => {
    if (typeof entry !== 'string')
        return entry.isFile();
    try {
        return fs.statSync(path.join(dirPath, entry)).isFile();
    }
    catch {
        return false;
    }
};
export default isFileEntry;
//# sourceMappingURL=is-file-entry.js.map