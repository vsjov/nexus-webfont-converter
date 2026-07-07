import type { Dirent } from 'node:fs';
/**
 * Gets the name from either a string entry or a filesystem dirent.
 *
 * @param entry - Directory entry to read
 * @returns Directory entry name
 */
export declare const getEntryName: (entry: string | Dirent) => string;
export default getEntryName;
//# sourceMappingURL=get-entry-name.d.ts.map