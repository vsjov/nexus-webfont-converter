import type { Dirent } from 'node:fs';
/**
 * Checks whether a directory entry is a file.
 *
 * @param dirPath - Parent directory path
 * @param entry - Directory entry to inspect
 * @returns `true` when the entry is a file
 */
export declare const isFileEntry: (dirPath: string, entry: string | Dirent) => boolean;
export default isFileEntry;
//# sourceMappingURL=is-file-entry.d.ts.map