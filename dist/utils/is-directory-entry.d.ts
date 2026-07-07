import type { Dirent } from 'node:fs';
/**
 * Checks whether a directory entry is a subdirectory.
 *
 * @param dirPath - Parent directory path
 * @param entry - Directory entry to inspect
 * @returns `true` when the entry is a directory
 */
export declare const isDirectoryEntry: (dirPath: string, entry: string | Dirent) => boolean;
export default isDirectoryEntry;
//# sourceMappingURL=is-directory-entry.d.ts.map